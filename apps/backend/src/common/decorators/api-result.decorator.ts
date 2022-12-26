import { Type, applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { BaseResponse } from '@/common/response.modal';

const baseTypeNames = ['String', 'Number', 'Boolean'];

/**
 * @description: 生成返回结果装饰器
 */
export const ApiResult = <TModel extends Type<any>>({
  type,
  struct,
  status,
}: {
  type?: TModel | TModel[];
  struct?: 'list' | 'page';
  status?: HttpStatus;
}) => {
  let prop = null;
  if (Array.isArray(type)) {
    if (struct === 'page') {
      prop = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: getSchemaPath(type[0]) },
          },
          total: {
            type: 'number',
            default: 0,
          },
        },
      };
    } else {
      prop = {
        type: 'array',
        items: { $ref: getSchemaPath(type[0]) },
      };
    }
  } else if (type) {
    if (type && baseTypeNames.includes(type.name)) {
      prop = { type: type.name.toLocaleLowerCase() };
    } else {
      prop = { $ref: getSchemaPath(type) };
    }
  } else {
    prop = { type: 'null', default: null };
  }

  return applyDecorators(
    ApiResponse({
      status: status,
      schema: {
        allOf: [
          { $ref: getSchemaPath(BaseResponse) },
          {
            properties: {
              data: prop,
            },
          },
        ],
      },
    }),
  );
};
