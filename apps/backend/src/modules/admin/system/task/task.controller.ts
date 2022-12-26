import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiExtraModels, ApiOperation, ApiTags } from '@nestjs/swagger';
import { isEmpty } from 'lodash';
import { PageRespData } from '@/common/response.modal';
import { ApiException } from '@/common/exceptions/api.exception';
import { SysTask } from '@/entities/admin/sys-task.entity';
import {
  TaskCheckIdDto,
  TaskCreateDto,
  TaskUpdateDto,
  TaskPageDto,
} from './task.dto';
import { SysTaskService } from './task.service';
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { ErrorEnum } from '@/common/constants/error';
import { ApiSecurityAuth } from '@/common/decorators/swagger.decorator';

@ApiTags('System - 任务调度模块')
@ApiSecurityAuth()
@ApiExtraModels(SysTask)
@Controller('task')
export class SysTaskController {
  constructor(private taskService: SysTaskService) {}

  @ApiOperation({ summary: '获取任务列表' })
  @ApiResult({ type: [SysTask] })
  @Get('page')
  async page(@Query() dto: TaskPageDto): Promise<PageRespData<SysTask>> {
    return await this.taskService.page(dto);
  }

  @ApiOperation({ summary: '添加任务' })
  @Post('add')
  async add(@Body() dto: TaskCreateDto): Promise<void> {
    const serviceCall = dto.service.split('.');
    await this.taskService.checkHasMissionMeta(serviceCall[0], serviceCall[1]);
    await this.taskService.addOrUpdate(dto);
  }

  @ApiOperation({ summary: '更新任务' })
  @Post('update')
  async update(@Body() dto: TaskUpdateDto): Promise<void> {
    const serviceCall = dto.service.split('.');
    await this.taskService.checkHasMissionMeta(serviceCall[0], serviceCall[1]);
    await this.taskService.addOrUpdate(dto);
  }

  @ApiOperation({ summary: '查询任务详细信息' })
  @ApiResult({ type: SysTask })
  @Get('info')
  async info(@Query() dto: TaskCheckIdDto): Promise<SysTask> {
    return await this.taskService.info(dto.id);
  }

  @ApiOperation({ summary: '手动执行一次任务' })
  @Post('once')
  async once(@Body() dto: TaskCheckIdDto): Promise<void> {
    const task = await this.taskService.info(dto.id);
    if (!isEmpty(task)) {
      await this.taskService.once(task);
    } else {
      throw new ApiException(ErrorEnum.CODE_1304);
    }
  }

  @ApiOperation({ summary: '停止任务' })
  @Post('stop')
  async stop(@Body() dto: TaskCheckIdDto): Promise<void> {
    const task = await this.taskService.info(dto.id);
    if (!isEmpty(task)) {
      await this.taskService.stop(task);
    } else {
      throw new ApiException(ErrorEnum.CODE_1304);
    }
  }

  @ApiOperation({ summary: '启动任务' })
  @Post('start')
  async start(@Body() dto: TaskCheckIdDto): Promise<void> {
    const task = await this.taskService.info(dto.id);
    if (!isEmpty(task)) {
      await this.taskService.start(task);
    } else {
      throw new ApiException(ErrorEnum.CODE_1304);
    }
  }

  @ApiOperation({ summary: '删除任务' })
  @Post('delete')
  async delete(@Body() dto: TaskCheckIdDto): Promise<void> {
    const task = await this.taskService.info(dto.id);
    if (!isEmpty(task)) {
      await this.taskService.delete(task);
    } else {
      throw new ApiException(ErrorEnum.CODE_1304);
    }
  }
}
