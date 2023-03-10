import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ApiException } from '@/common/exceptions/api.exception';
import { AdminWSService } from '@/modules/ws/admin-ws.service';
import { AdminWSGateway } from '@/modules/ws/admin-ws.gateway';
import { EVENT_KICK } from '@/modules/ws/ws.event';
import { EntityManager } from 'typeorm';
import { UAParser } from 'ua-parser-js';
import { SysUserService } from '../user/user.service';
import { OnlineUserInfo } from './online.modal';
import { ErrorEnum } from '@/common/constants/error';

@Injectable()
export class SysOnlineService {
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
    private userService: SysUserService,
    private adminWsGateWay: AdminWSGateway,
    private adminWSService: AdminWSService,
    private jwtService: JwtService,
  ) {}

  /**
   * 罗列在线用户列表
   */
  async listOnlineUser(currentUid: number): Promise<OnlineUserInfo[]> {
    const onlineSockets = await this.adminWSService.getOnlineSockets();
    if (!onlineSockets || onlineSockets.length <= 0) {
      return [];
    }
    const onlineIds = onlineSockets.map((socket) => {
      const token = socket.handshake.query?.token as string;
      return this.jwtService.verify(token).uid;
    });
    return await this.findLastLoginInfoList(onlineIds, currentUid);
  }

  /**
   * 下线当前用户
   */
  async kickUser(uid: number, currentUid: number): Promise<void> {
    const rootUserId = await this.userService.findRootUserId();
    const currentUserInfo = await this.userService.getAccountInfo(currentUid);
    if (uid === rootUserId) {
      throw new ApiException(ErrorEnum.CODE_1013);
    }
    // reset redis keys
    await this.userService.forbidden(uid);
    // socket emit
    const socket = await this.adminWSService.findSocketIdByUid(uid);
    if (socket) {
      // socket emit event
      this.adminWsGateWay.socketServer
        .to(socket.id)
        .emit(EVENT_KICK, { operater: currentUserInfo.username });
      // close socket
      socket.disconnect();
    }
  }

  /**
   * 根据用户id列表查找最近登录信息和用户信息
   */
  async findLastLoginInfoList(
    ids: number[],
    currentUid: number,
  ): Promise<OnlineUserInfo[]> {
    const rootUserId = await this.userService.findRootUserId();
    const result = await this.entityManager.query(
      `
      SELECT sys_login_log.created_at, sys_login_log.ip, sys_login_log.address, sys_login_log.ua, sys_user.id, sys_user.username, sys_user.nick_name
        FROM sys_login_log
        INNER JOIN sys_user ON sys_login_log.user_id = sys_user.id
        WHERE sys_login_log.created_at IN (SELECT MAX(created_at) as createdAt FROM sys_login_log GROUP BY user_id)
          AND sys_user.id IN (?)
      `,
      [ids],
    );
    if (result) {
      const parser = new UAParser();
      return result.map((e) => {
        const u = parser.setUA(e.ua).getResult();
        return {
          id: e.id,
          ip: e.ip,
          address: e.address,
          username: `${e.nick_name}（${e.username}）`,
          isCurrent: currentUid === e.id,
          time: e.created_at,
          os: `${u.os.name} ${u.os.version}`,
          browser: `${u.browser.name} ${u.browser.version}`,
          disable: currentUid === e.id || e.id === rootUserId,
        };
      });
    }
    return [];
  }
}
