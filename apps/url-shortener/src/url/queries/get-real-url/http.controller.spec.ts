import { HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { GetRealUrl, HttpController } from '.';

describe('GetRealUrl.HttpController', () => {
  let controller: HttpController;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HttpController],
      providers: [
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(HttpController);
    queryBus = module.get(QueryBus);
  });

  it('should set redirect headers and return a JSON fallback', async () => {
    const url = 'https://example.com';
    const executeSpy = jest
      .spyOn(queryBus, 'execute')
      .mockResolvedValue(new GetRealUrl.QueryOutput({ url }));

    const response = {
      status: jest.fn().mockReturnThis(),
      location: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const result = await controller.redirectToUrl(
      { shortUrlId: 'abc123' } as GetRealUrl.HttpRequestParamDto,
      response,
    );

    expect(executeSpy).toHaveBeenCalledWith(
      new GetRealUrl.Query({ shortUrlId: 'abc123' }),
    );
    expect(response.status).toHaveBeenCalledWith(HttpStatus.FOUND);
    expect(response.location).toHaveBeenCalledWith(url);
    expect(result).toEqual(
      new GetRealUrl.HttpResponseDto({
        url,
        redirectStatusCode: HttpStatus.FOUND as 302 | 307,
      }),
    );
  });
});
