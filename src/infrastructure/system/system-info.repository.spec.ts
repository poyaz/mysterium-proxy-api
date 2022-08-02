import {Test, TestingModule} from '@nestjs/testing';
import axios from 'axios';
import {SystemInfoRepository} from './system-info.repository';
import {RepositoryException} from '@src-core/exception/repository.exception';

jest.mock('axios');

describe('SystemInfoRepository', () => {
  let repository: SystemInfoRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SystemInfoRepository,
          inject: [],
          useFactory: () => new SystemInfoRepository(),
        },
      ],
    }).compile();

    repository = module.get<SystemInfoRepository>(SystemInfoRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe(`Get outgoing ip address`, () => {
    let ipAddress: string;

    beforeEach(() => {
      ipAddress = '92.42.46.74';
    });

    it(`Should error get outgoing ip address when two request has been failed`, async () => {
      const executeError = new Error('Execute call error');
      (<jest.Mock>axios.get).mockRejectedValueOnce(executeError).mockRejectedValueOnce(executeError);

      const [error] = await repository.getOutgoingIpAddress();

      expect(axios.get).toHaveBeenCalledTimes(2);
      expect((<jest.Mock>axios.get).mock.calls[0]).toEqual(expect.arrayContaining([
        'https://ifconfig.io/all.json',
        {
          headers: {
            'content-type': 'application.json',
          },
        },
      ]));
      expect((<jest.Mock>axios.get).mock.calls[1]).toEqual(expect.arrayContaining([
        'https://api.ipify.org',
        {
          headers: {
            'content-type': 'application.json',
          },
          params: {
            format: 'json',
          },
        },
      ]));
      expect(error).toBeInstanceOf(RepositoryException);
      expect((<RepositoryException>error).additionalInfo).toEqual(executeError);
      expect((<RepositoryException>error).combineInfo.length).toEqual(2);
      expect((<RepositoryException>error).combineInfo[0]).toEqual(executeError);
      expect((<RepositoryException>error).combineInfo[1]).toEqual(executeError);
    });

    it(`Should successfully get outgoing ip address when first of two request has been failed`, async () => {
      const executeError = new Error('Execute call error');
      (<jest.Mock>axios.get)
        .mockResolvedValueOnce({
          data: {
            'country_code': 'DE',
            'encoding': 'gzip',
            'forwarded': ipAddress,
            'host': ipAddress,
            'ifconfig_hostname': 'ifconfig.io',
            'ip': ipAddress,
            'lang': '',
            'method': 'GET',
            'mime': '*/*',
            'port': 41080,
            'referer': '',
            'ua': 'curl/7.64.0',
          },
        })
        .mockRejectedValueOnce(executeError);

      const [error, result] = await repository.getOutgoingIpAddress();

      expect(axios.get).toHaveBeenCalledTimes(2);
      expect((<jest.Mock>axios.get).mock.calls[0]).toEqual(expect.arrayContaining([
        'https://ifconfig.io/all.json',
        {
          headers: {
            'content-type': 'application.json',
          },
        },
      ]));
      expect((<jest.Mock>axios.get).mock.calls[1]).toEqual(expect.arrayContaining([
        'https://api.ipify.org',
        {
          headers: {
            'content-type': 'application.json',
          },
          params: {
            format: 'json',
          },
        },
      ]));
      expect(error).toBeNull();
      expect(result).toEqual(ipAddress);
    });

    it(`Should successfully get outgoing ip address when second of two request has been failed`, async () => {
      const executeError = new Error('Execute call error');
      (<jest.Mock>axios.get)
        .mockRejectedValueOnce(executeError)
        .mockResolvedValueOnce({
          data: {
            'ip': ipAddress,
          },
        });


      const [error, result] = await repository.getOutgoingIpAddress();

      expect(axios.get).toHaveBeenCalledTimes(2);
      expect((<jest.Mock>axios.get).mock.calls[0]).toEqual(expect.arrayContaining([
        'https://ifconfig.io/all.json',
        {
          headers: {
            'content-type': 'application.json',
          },
        },
      ]));
      expect((<jest.Mock>axios.get).mock.calls[1]).toEqual(expect.arrayContaining([
        'https://api.ipify.org',
        {
          headers: {
            'content-type': 'application.json',
          },
          params: {
            format: 'json',
          },
        },
      ]));
      expect(error).toBeNull();
      expect(result).toEqual(ipAddress);
    });

    it(`Should successfully get outgoing ip address all request execute successfully`, async () => {
      const executeError = new Error('Execute call error');
      (<jest.Mock>axios.get)
        .mockResolvedValueOnce({
          data: {
            'country_code': 'DE',
            'encoding': 'gzip',
            'forwarded': ipAddress,
            'host': ipAddress,
            'ifconfig_hostname': 'ifconfig.io',
            'ip': ipAddress,
            'lang': '',
            'method': 'GET',
            'mime': '*/*',
            'port': 41080,
            'referer': '',
            'ua': 'curl/7.64.0',
          },
        })
        .mockResolvedValueOnce({
          data: {
            'ip': ipAddress,
          },
        });


      const [error, result] = await repository.getOutgoingIpAddress();

      expect(axios.get).toHaveBeenCalledTimes(2);
      expect((<jest.Mock>axios.get).mock.calls[0]).toEqual(expect.arrayContaining([
        'https://ifconfig.io/all.json',
        {
          headers: {
            'content-type': 'application.json',
          },
        },
      ]));
      expect((<jest.Mock>axios.get).mock.calls[1]).toEqual(expect.arrayContaining([
        'https://api.ipify.org',
        {
          headers: {
            'content-type': 'application.json',
          },
          params: {
            format: 'json',
          },
        },
      ]));
      expect(error).toBeNull();
      expect(result).toEqual(ipAddress);
    });
  });
});
