import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolePageDto } from './role.dto';
import { PageRespData } from '@/common/response.modal';
import { SysRole } from '@/entities/admin/sys-role.entity';
import { SysRoleService } from './role.service';
import {
  RoleCreateDto,
  RoleDeleteDto,
  RoleInfoDto,
  RoleUpdateDto,
} from './role.dto';
import { ApiException } from '@/common/exceptions/api.exception';
import { RoleInfo } from './role.modal';
import { SysMenuService } from '../menu/menu.service';
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { ErrorEnum } from '@/common/constants/error';
import { ApiSecurityAuth } from '@/common/decorators/swagger.decorator';

@ApiTags('System - 角色模块')
@ApiSecurityAuth()
@ApiExtraModels(RoleInfo)
@Controller('role')
export class SysRoleController {
  constructor(
    private roleService: SysRoleService,
    private menuService: SysMenuService,
  ) {}

  @ApiOperation({ summary: '获取角色列表' })
  @ApiResult({ type: [SysRole] })
  @Get('list')
  async list(): Promise<SysRole[]> {
    return await this.roleService.list();
  }

  @ApiOperation({ summary: '分页查询角色信息' })
  @ApiResult({ type: [SysRole] })
  @Get('page')
  async page(@Query() dto: RolePageDto): Promise<PageRespData<SysRole>> {
    return await this.roleService.page(dto);
  }

  @ApiOperation({ summary: '获取角色信息' })
  @ApiResult({ type: RoleInfo })
  @Get('info')
  async info(@Query() dto: RoleInfoDto): Promise<RoleInfo> {
    return await this.roleService.info(dto.id);
  }

  @ApiOperation({ summary: '新增角色' })
  @Post('add')
  async add(@Body() dto: RoleCreateDto): Promise<void> {
    await this.roleService.add(dto);
  }

  @ApiOperation({ summary: '更新角色' })
  @Post('update')
  async update(@Body() dto: RoleUpdateDto): Promise<void> {
    await this.roleService.update(dto);
    await this.menuService.refreshOnlineUserPerms();
  }

  @ApiOperation({ summary: '删除角色' })
  @Post('delete')
  async delete(@Body() dto: RoleDeleteDto): Promise<void> {
    const count = await this.roleService.countUserIdByRole(dto.ids);
    if (count > 0) {
      throw new ApiException(ErrorEnum.CODE_1008);
    }
    await this.roleService.delete(dto.ids);
    await this.menuService.refreshOnlineUserPerms();
  }
}
