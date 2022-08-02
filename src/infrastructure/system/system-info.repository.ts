import {Injectable} from '@nestjs/common';
import {ISystemInfoRepositoryInterface} from '@src-core/interface/i-system-info-repository.interface';
import axios from 'axios';
import {AsyncReturn} from '@src-core/utility';
import {RepositoryException} from '@src-core/exception/repository.exception';

@Injectable()
export class SystemInfoRepository implements ISystemInfoRepositoryInterface {
  async getOutgoingIpAddress(): Promise<AsyncReturn<Error, string>> {
    const [
      [firstExecError, firstExecData],
      [secondExecError, secondExecData],
    ] = await Promise.all([
      SystemInfoRepository._getFirstOutgoingIpAddress(),
      SystemInfoRepository._getSecondOutgoingIpAddress(),
    ]);
    if (firstExecError && secondExecError) {
      return [new RepositoryException([firstExecError, secondExecError])];
    }

    const ipAddress = firstExecData || secondExecData;

    return [null, ipAddress];
  }

  private static async _getFirstOutgoingIpAddress(): Promise<AsyncReturn<Error, string>> {
    try {
      const response = await axios.get(`https://ifconfig.io/all.json`, {
        headers: {
          'content-type': 'application.json',
        },
      });

      return [null, response.data.ip];
    } catch (error) {
      return [error];
    }
  }

  private static async _getSecondOutgoingIpAddress(): Promise<AsyncReturn<Error, string>> {
    try {
      const response = await axios.get(`https://api.ipify.org`, {
        headers: {
          'content-type': 'application.json',
        },
        params: {
          format: 'json',
        },
      });

      return [null, response.data.ip];
    } catch (error) {
      return [error];
    }
  }
}
