// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

import { errors, SharedAccessSignature, ConnectionString } from 'azure-iot-common';
import { RestApiClient } from 'azure-iot-http-base';
import { QuerySpecification, ProvisioningServiceQuery, ProvisioningServiceQueryCallback } from './query';
import { Enrollment, EnrollmentGroup, DeviceRegistrationStatus, BulkOperation, BulkOperationResult } from './interfaces';

// tslint:disable-next-line:no-var-requires
const packageJson = require('../package.json');

const ArgumentError = errors.ArgumentError;

export type DeleteCallback = (err?: Error) => void;

export class DeviceEnrollment {

  private readonly _enrollmentGroupsPrefix: string = '/enrollmentGroups/';
  private readonly _enrollmentsPrefix: string = '/enrollments/';
  private readonly _registrationsPrefix: string = '/registrations/';
  private _config: RestApiClient.TransportConfig;
  private _restApiClient: RestApiClient;

  constructor(config: RestApiClient.TransportConfig, restApiClient?: RestApiClient) {
    if (!config) {
      /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_001: [The `DeviceEnrollment` construction shall throw a `ReferenceError` if the `config` object is falsy.] */
      throw new ReferenceError('The \'config\' parameter cannot be \'' + config + '\'');
    } else if (!config.host || !config.sharedAccessSignature) {
      /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_002: [The `DeviceEnrollment` constructor shall throw an `ArgumentError` if the `config` object is missing one or more of the following properties:
                                                            - `host`: the IoT Hub hostname
                                                            - `sharedAccessSignature`: shared access signature with the permissions for the desired operations.] */
      throw new ArgumentError('The \'config\' argument is missing either the host or the sharedAccessSignature property');
    }
    this._config = config;

    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_003: [The `DeviceEnrollment` constructor shall use the `restApiClient` provided as a second argument if it is provided.] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_004: [The `DeviceEnrollment` constructor shall use `azure-iot-http-base.RestApiClient` if no `restApiClient` argument is provided.] */
    this._restApiClient = restApiClient || new RestApiClient(config, packageJson.name + '/' + packageJson.version);
  }

  /**
   *
   * @summary Create or update a device enrollment record.
   * @param enrollment The device enrollment record.
   * @param callback Invoked upon completion of the operation.
   */
  public createOrUpdateIndividualEnrollment(enrollment: Enrollment, callback?: (err: Error, enrollment?: Enrollment, response?: any) => void): void {
    this._createOrUpdate(this._enrollmentsPrefix, enrollment, callback);
  }

  /**
   *
   * @summary deleteIndividualEnrollment a device enrollment record.
   * @param enrollmentOrId An Enrollment object or a string containing the registration id.
   * @param etagOrCallback In the case of the first argument being a string this could be an etag (or the callback).
   * @param deleteCallback Invoked upon completion of the operation.
   */
  public deleteIndividualEnrollment(enrollmentOrId: string | Enrollment, etagOrCallback?: string | DeleteCallback, deleteCallback?: DeleteCallback): void {
    this._delete(this._enrollmentsPrefix, enrollmentOrId, etagOrCallback, deleteCallback);
  }

  /**
   *
   * @summary Get a device enrollment record.
   * @param id Registration ID.
   * @param getCallback Invoked upon completion of the operation.
   */
  public getIndividualEnrollment(id: string, getCallback: (err: Error, enrollmentRecord?: Enrollment, response?: any ) => void): void {
    this._get(this._enrollmentsPrefix, id, getCallback);
  }

  /**
   * @summary Creates a query that can be used to return pages of existing enrollments.
   * @param querySpecification The query specification.
   * @param pageSize The number of elements to return per page.
   */
  createQueryIndividualEnrollment(querySpecification: QuerySpecification, pageSize?: number): ProvisioningServiceQuery{
    return new ProvisioningServiceQuery(this._getEnrollFunc(this._enrollmentsPrefix, querySpecification, pageSize));
  }

  /**
   *
   * @summary Gets the device registration status.
   * @param id Registration ID.
   * @param callback Invoked upon completion of the operation.
   */
  public getDeviceRegistrationStatus(id: string, callback: (err: Error, registrationStatus?: DeviceRegistrationStatus, response?: any) => void): void {
    this._get(this._registrationsPrefix, id, callback);
  }

  /**
   *
   * @summary Create or update a device enrollment group.
   * @param enrollmentGroup The device enrollment group.
   * @param callback Invoked upon completion of the operation.
   */
  public createOrUpdateEnrollmentGroup(enrollmentGroup: EnrollmentGroup, callback?: (err: Error, enrollmentGroup?: EnrollmentGroup, response?: any) => void): void {
    this._createOrUpdate(this._enrollmentGroupsPrefix, enrollmentGroup, callback);
  }

  /**
   *
   * @summary Delete a device enrollment group.
   * @param enrollmentGroupOrId EnrollmentGroup object or a string containing the enrollment Group Id.
   * @param etagOrCallback In the case of the first argument being a string this could be an etag (or the callback).
   * @param deleteCallback Invoked upon completion of the operation.
   */
  public deleteEnrollmentGroup(enrollmentGroupOrId: string | EnrollmentGroup, etagOrCallback?: string | DeleteCallback, deleteCallback?: DeleteCallback): void {
    this._delete(this._enrollmentGroupsPrefix, enrollmentGroupOrId, etagOrCallback, deleteCallback);
  }

  /**
   *
   * @summary Get a device enrollment group.
   * @param id Enrollment group ID.
   * @param getCallback Invoked upon completion of the operation.
   */
  public getEnrollmentGroup(id: string, getCallback: (err: Error, enrollmentGroup: EnrollmentGroup, response?: any) => void): void {
    this._get(this._enrollmentGroupsPrefix, id, getCallback);
  }

  /**
   * @summary Creates a query that can be used to return pages of existing enrollment groups.
   * @param querySpecification The query specification.
   * @param pageSize The number of elements to return per page.
   */
  createQueryEnrollmentGroup(querySpecification: QuerySpecification, pageSize?: number): ProvisioningServiceQuery {
    return new ProvisioningServiceQuery(this._getEnrollFunc(this._enrollmentGroupsPrefix, querySpecification, pageSize));
  }

  /**
   * @summary Creates a query that can be used to return pages of existing device registration status.
   * @param querySpecification The query specification.
   * @param pageSize The number of elements to return per page.
   */
  createQueryDeviceRegistrationStatus(querySpecification: QuerySpecification, pageSize?: number): ProvisioningServiceQuery {
    return new ProvisioningServiceQuery(this._getEnrollFunc(this._registrationsPrefix, querySpecification, pageSize));
  }

  /**
   *
   * @summary Bulk device enrollment operation.
   * @param bulkOperation Bulk operation.
   * @param callback Invoked upon completion of the operation.
   */
  public bulkOperation(bulkOperation: BulkOperation, callback?: (err: Error, bulkOperationResult?: BulkOperationResult, response?: any) => void): void {
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_038: [The `bulkOperation` method shall throw `ReferenceError` if the `bulkOperation` argument is falsy.] */
    if (!bulkOperation) {
      throw new ReferenceError('Required bulkOperation property was null or undefined when calling bulkOperation.');
    }

    const path = this._enrollmentsPrefix + this._versionQueryString();

    const httpHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8'
    };

    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_039: [** The `bulkOperation` method shall construct an HTTP request using information supplied by the caller as follows:
      POST /enrollments?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Accept: application/json
      Content-Type: application/json; charset=utf-8

      <stringified json string of the bulkOperation argument>
      ] */
    this._restApiClient.executeApiCall('POST', path, httpHeaders, bulkOperation, (err, bulkOperationResult, httpResponse) => {
      if (callback) {
        if (err) {
          callback(err);
        } else {
          callback(null, bulkOperationResult, httpResponse);
        }
      }
    });
  }

  /**
   *
   * @summary Delete the device registration status.
   * @param idOrRegistration A string containing the registration id OR an actual DeviceRegistrationStatus.
   * @param etagOrCallback In the case of the first argument being a string this could be an etag (or the callback).
   * @param deleteCallback Invoked upon completion of the operation.
   */
  public deleteDeviceRegistrationStatus(idOrRegistrationStatus: string | DeviceRegistrationStatus, etagOrCallback?: string | DeleteCallback, deleteCallback?: DeleteCallback): void {
    this._delete(this._registrationsPrefix, idOrRegistrationStatus, etagOrCallback, deleteCallback);
  }

  private _getEnrollFunc(prefix: string, querySpecification: QuerySpecification, pageSize: number): (continuationToken: string, done: ProvisioningServiceQueryCallback) => void {
    return (continuationToken, done) => {
      const path = prefix + 'query' + this._versionQueryString();

      let headers = {
        'Accept': 'application/json',
         'Content-Type': 'application/json; charset=utf-8'
      };

      if (continuationToken) {
        headers['x-ms-continuation'] = continuationToken;
      }

      if (pageSize) {
        headers['x-ms-max-item-count'] = pageSize;
      }

      this._restApiClient.executeApiCall('POST', path, headers, querySpecification, done);
    };
  }

  private _versionQueryString(): string {
    return '?api-version=2017-08-31-preview';
  }

  private _createOrUpdate(endpointPrefix: string, enrollment: any, callback?: (err: Error, enrollmentResponse?: any, response?: any) => void): void {
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_009: [The `createOrUpdateIndividualEnrollment` method shall throw `ReferenceError` if the `Enrollment` argument is falsy.]*/
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_012: [The `createOrUpdateEnrollmentGroup` method shall throw `ReferenceError` if the `EnrollmentGroup` argument is falsy.] */
    if (!enrollment) {
      throw new ReferenceError('Required parameter enrollment was null or undefined when calling createOrUpdate.');
    }

    let id: string;
    if (endpointPrefix === this._enrollmentGroupsPrefix) {
      id = enrollment.enrollmentGroupId;
    } else {
      id = enrollment.registrationId;
    }

    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_011: [The `createOrUpdateIndividualEnrollment` method shall throw `ArgumentError` if the `enrollment.registrationId` property is falsy.] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_013: [`createOrUpdateEnrollmentGroup` method shall throw `ArgumentError` if the `enrollmentGroup.enrollmentGroupsId` property is falsy.] */
    if (!id) {
      throw new ArgumentError('Required id property was null or undefined when calling createOrUpdate.');
    }
    const path = endpointPrefix + encodeURIComponent(id) + this._versionQueryString();

    const httpHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8'
    };
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_010: [The `createOrUpdateIndividualEnrollment` method shall construct an HTTP request using information supplied by the caller, as follows:
      PUT /enrollments/<uri-encoded-enrollment.registrationId>?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Accept: application/json
      Content-Type: application/json; charset=utf-8

      <stringified json string of the enrollment argument>]*/
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_014: [The `createOrUpdateEnrollmentGroup` method shall construct an HTTP request using information supplied by the caller, as follows:
      PUT /enrollmentGroups/<uri-encoded-enrollmentGroup.enrollmentGroupsId>?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      Accept: application/json
      Content-Type: application/json; charset=utf-8

      <stringified json string of the enrollmentGroup argument>
      ] */
    this._restApiClient.executeApiCall('PUT', path, httpHeaders, enrollment, (err, enrollmentResponse, httpResponse) => {
      if (callback) {
        if (err) {
          callback(err);
        } else {
          callback(null, enrollmentResponse, httpResponse);
        }
      }
    });
  }

  private _delete(endpointPrefix: string, enrollmentOrIdOrRegistration: string | any, etagOrCallback?: string | DeleteCallback, deleteCallback?: DeleteCallback): void {
    let ifMatch: string;
    let suppliedCallback: DeleteCallback;
    let id: string;

    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_015: [The `deleteIndividualEnrollment` method shall throw `ReferenceError` if the `enrollmentOrId` argument is falsy.] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_016: [The `deleteEnrollmentGroup` method shall throw `ReferenceError` if the `enrollmentGroupOrId` argument is falsy.] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_025: [The `deleteDeviceRegistrationStatus` method shall throw `ReferenceError` if the `idOrRegistrationStatus` argument is falsy.] */
    if (!enrollmentOrIdOrRegistration) {
      throw new ReferenceError('Required parameter \'' + enrollmentOrIdOrRegistration + '\' was null or undefined when calling delete.');
    }

    if (typeof enrollmentOrIdOrRegistration === 'string') {
      id = enrollmentOrIdOrRegistration;
      /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_040: [The `deleteIndividualEnrollment` method, if the first argument is a string, the second argument if present, must be a string or a callback, otherwise shall throw ArgumentError. .] */
      /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_045: [The `deleteEnrollmentGroup` method, if the first argument is a string, the second argument if present, must be a string or a callback, otherwise shall throw ArgumentError.] */
      /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_050: [The `deleteDeviceRegistrationStatus` method, if the first argument is a string, the second argument if present, must be a string or a callback, otherwise shall throw ArgumentError.] */
      if (!etagOrCallback) {
        ifMatch = undefined;
        suppliedCallback = undefined;
      } else if (typeof etagOrCallback === 'string') {
        /*Codes_**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_044: [** The `deleteIndividualEnrollment` method, if the first argument is a string, and the second argument is a string, shall construct an HTTP request using information supplied by the caller as follows:
          DELETE /enrollments/<uri-encoded-enrollmentOrId>?api-version=<version> HTTP/1.1
          If-Match: <second argument>
          Authorization: <sharedAccessSignature>
          */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_049: [** The `deleteEnrollmentGroup` method, if the first argument is a string, and the second argument is a string, shall construct an HTTP request using information supplied by the caller as follows:
          DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId>?api-version=<version> HTTP/1.1
          If-Match: <second argument>
          Authorization: <sharedAccessSignature>
          ] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_054: [** The `deleteDeviceRegistrationStatus` method, if the first argument is a string, and the second argument is a string, shall construct an HTTP request using information supplied by the caller as follows:
          DELETE /registrations/<uri-encoded-idOrRegistrationStatus>?api-version=<version> HTTP/1.1
          If-Match: <second argument>
          Authorization: <sharedAccessSignature>
          ] */
        ifMatch = etagOrCallback;
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_041: [The `deleteIndividualEnrollment` method, if the first argument is a string and the second argument is a string, the third argument if present, must be a callback, otherwise shall throw ArgumentError.] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_046: [The `deleteEnrollmentGroup` method, if the first argument is a string and the second argument is a string, the third argument if present, must be a callback, otherwise shall throw ArgumentError.] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_051: [The `deleteDeviceRegistrationStatus` method, if the first argument is a string and the second argument is a string, the third argument if present, must be a callback, otherwise shall throw ArgumentError.] */
        if (!deleteCallback) {
          suppliedCallback = undefined;
        } else if (typeof deleteCallback !== 'function') {
          throw new ArgumentError('Third argument of this delete method must be a function.');
        } else {
          suppliedCallback = deleteCallback;
        }
      } else if (typeof etagOrCallback === 'function') {
        /*Codes_**SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_043: [** The `deleteIndividualEnrollment` method, if the first argument is a string, and the second argument is NOT a string, shall construct an HTTP request using information supplied by the caller as follows:
          DELETE /enrollments/<uri-encoded-enrollmentOrId>?api-version=<version> HTTP/1.1
          Authorization: <sharedAccessSignature>
          */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_048: [** The `deleteEnrollmentGroup` method, if the first argument is a string, and the second argument is NOT a string, shall construct an HTTP request using information supplied by the caller as follows:
          DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId>?api-version=<version> HTTP/1.1
          Authorization: <sharedAccessSignature>
          ] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_053: [** The `deleteDeviceRegistrationStatus` method, if the first argument is a string, and the second argument is NOT a string, shall construct an HTTP request using information supplied by the caller as follows:
          DELETE /registrations/<uri-encoded-idOrRegistrationStatus>?api-version=<version> HTTP/1.1
          Authorization: <sharedAccessSignature>
          ] */
        ifMatch = undefined;
        suppliedCallback = etagOrCallback;
      } else {
        throw new ArgumentError('Second argument of this delete method must be a string or function.');
      }
    } else {
      if (endpointPrefix === this._enrollmentsPrefix) {
        if (!enrollmentOrIdOrRegistration.registrationId) {
          /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_017: [The `deleteIndividualEnrollment` method, if the first argument is an Enrollment object, shall throw an ArgumentError, if the registrationId property is falsy.] */
          throw new ArgumentError('Required property \'registrationId\' was null or undefined when calling delete.');
        }
        id = enrollmentOrIdOrRegistration.registrationId;
      } else if (endpointPrefix === this._enrollmentGroupsPrefix) {
        if (!enrollmentOrIdOrRegistration.enrollmentGroupId) {
          /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_018: [The `deleteEnrollmentGroup` method, if the first argument is an EnrollmentGroup object, shall throw an ArgumentError, if the `enrollmentGroupId' property is falsy.] */
          throw new ArgumentError('Required property \'enrollmentGroupId\' was null or undefined when calling delete.');
        }
        id = enrollmentOrIdOrRegistration.enrollmentGroupId;
      } else if (endpointPrefix === this._registrationsPrefix) {
        if (!enrollmentOrIdOrRegistration.registrationId) {
          /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_026: [The `deleteDeviceRegistrationStatus` method, if the first argument is a `DeviceRegistrationStatus` object, shall throw an ArgumentError, if the `registrationId' property is falsy.] */
          throw new ArgumentError('Required property \'registrationId\' was null or undefined when calling delete.');
        }
        id = enrollmentOrIdOrRegistration.registrationId;
      } else {
        throw new ArgumentError('Invalid path specified for delete operation.');
      }

      /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_042: [The `deleteIndividualEnrollment` method, if the first argument is an Enrollment object, the second argument if present, must be a callback, otherwise shall throw ArgumentError.] */
      /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_047: [The `deleteEnrollmentGroup` method, if the first argument is an EnrollmentGroup object, the second argument if present, must be a callback, otherwise shall throw ArgumentError.] */
      /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_052: [The `deleteDeviceRegistrationStatus` method, if the first argument is an DeviceRegistrationStatus object, the second argument if present, must be a callback, otherwise shall throw ArgumentError.] */
      if (!etagOrCallback) {
        suppliedCallback = undefined;
      } else if (typeof etagOrCallback !== 'function') {
        throw new ArgumentError('The second argument of this delete function if present MUST be a function.');
      } else {
        suppliedCallback = etagOrCallback;
      }

      if (enrollmentOrIdOrRegistration.etag) {
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_021: [The `deleteIndividualEnrollment` method, if the first argument is an enrollment object, with a non-falsy etag property, shall construct an HTTP request using information supplied by the caller as follows:
          DELETE /enrollments/<uri-encoded-enrollmentOrIdOrRegistration.registrationId>?api-version=<version> HTTP/1.1
          If-Match: enrollmentOrIdOrRegistration.etag
          Authorization: <sharedAccessSignature>
          ] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_022: [The `deleteEnrollmentGroup` method, if the first argument is an EnrollmentGroup object, with a non-falsy etag property, shall construct an HTTP request using information supplied by the caller as follows:
          DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId.enrollmentGroupId>?api-version=<version> HTTP/1.1
          If-Match: enrollmentParameter.etag
          Authorization: <sharedAccessSignature>
          ] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_028: [** The `deleteDeviceRegistrationStatus` method, if the first argument is a `DeviceRegistrationStatus` object, with a non-falsy etag property, shall construct an HTTP request using information supplied by the caller as follows:
          DELETE /registrations/<uri-encoded-idOrRegistrationStatus.registrationId>?api-version=<version> HTTP/1.1
          If-Match: idOrRegistrationStatus.etag
          Authorization: <sharedAccessSignature>
          ] */
        ifMatch = enrollmentOrIdOrRegistration.etag;
      } else {
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_023: [The `deleteEnrollmentGroup` method, if the first argument is an EnrollmentGroup object, with a falsy etag property, shall construct an HTTP request using information supplied by the caller as follows:
          DELETE /enrollmentGroups/<uri-encoded-enrollmentGroupOrId.enrollmentGroupId>?api-version=<version> HTTP/1.1
          Authorization: <sharedAccessSignature>
          ] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_024: [The `deleteIndividualEnrollment` method, if the first argument is an enrollment object, with a falsy etag property, shall construct an HTTP request using information supplied by the caller as follows:
          DELETE /enrollments/<uri-encoded-enrollmentParameter.registrationId>?api-version=<version> HTTP/1.1
          Authorization: <sharedAccessSignature>
          ] */
        /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_029: [** The `deleteDeviceRegistrationStatus` method, if the first argument is a `DeviceRegistrationStatus` object, with a falsy etag property, shall construct an HTTP request using information supplied by the caller as follows:
          DELETE /registrations/<uri-encoded-idOrRegistrationStatus.registrationId>?api-version=<version> HTTP/1.1
          Authorization: <sharedAccessSignature>
          ] */
        ifMatch = undefined;
      }
    }

    const path = endpointPrefix + encodeURIComponent(id) + this._versionQueryString();

    let httpHeaders = {};

    if (ifMatch) {
      httpHeaders['If-Match'] = ifMatch;
    }

    this._restApiClient.executeApiCall('DELETE', path, httpHeaders, null, (err) => {
      if (suppliedCallback) {
        if (err) {
          suppliedCallback(err);
        } else {
          suppliedCallback(null);
        }
      }
    });
  }

  private _get(endpointPrefix: string, id: string, getCallback: (err: Error, enrollmentOrRegistrationStatus?: any, response?: any ) => void): void {
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_030: [The `getIndividualEnrollment` method shall throw `ReferenceError` if the id argument is falsy.] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_031: [The `getEnrollmentGroup` method shall throw `ReferenceError` if the id argument is falsy.] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_032: [The `getDeviceRegistrationStatus` method shall throw `ReferenceError` if the id argument is falsy.] */
    if (!id) {
      throw new ReferenceError('Required parameter \'' + id + '\' was null or undefined when calling get.');
    }

    const path = endpointPrefix + encodeURIComponent(id) + this._versionQueryString();

    const httpHeaders = {
      'Accept': 'application/json'
    };
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_033: [** The `getIndividualEnrollment` method shall construct an HTTP request using information supplied by the caller as follows:
      GET /enrollments/<uri-encoded-id>?api-version=<version> HTTP/1.1
      Accept: application/json
      Authorization: <sharedAccessSignature>
      ] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_034: [** The `getEnrollmentGroup` method shall construct an HTTP request using information supplied by the caller as follows:
      GET /enrollmentGroups/<uri-encoded-id>?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      ] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_035: [** The `getDeviceRegistrationStatus` method shall construct an HTTP request using information supplied by the caller as follows:
      GET /registrations/<uri-encoded-id>?api-version=<version> HTTP/1.1
      Authorization: <sharedAccessSignature>
      ] */
    this._restApiClient.executeApiCall('GET', path, httpHeaders, null, (err, enrollmentOrRegistrationStatus, httpResponse) => {
      if (err) {
        getCallback(err);
      } else {
        getCallback(null, enrollmentOrRegistrationStatus, httpResponse);
      }
    });
  }

  /**
   * @method          module:azure-iothub.DeviceEnrollment.fromConnectionString
   * @description     Constructs a DeviceEnrollment object from the given connection
   *                  string using the default transport
   *                  ({@link module:azure-iothub.Http|Http}).
   * @param {String}  value       A connection string which encapsulates the
   *                              appropriate (read and/or write) DeviceEnrollment
   *                              permissions.
   * @returns {module:azure-iothub.DeviceEnrollment}
   */
  static fromConnectionString(value: string): DeviceEnrollment {
     /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_005: [The `fromConnectionString` method shall throw `ReferenceError` if the value argument is falsy.]*/
     if (!value) throw new ReferenceError('value is \'' + value + '\'');

    const cn = ConnectionString.parse(value);

    const config: RestApiClient.TransportConfig = {
      host: cn.HostName,
      sharedAccessSignature: SharedAccessSignature.create(cn.HostName, cn.SharedAccessKeyName, cn.SharedAccessKey, Date.now())
    };
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_006: [`fromConnectionString` method shall derive and transform the needed parts from the connection string in order to create a `config` object for the constructor (see `SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_002`).] */
    /*Codes_SRS_NODE_PROVISIONING_SERVICE_CLIENT_06_007: [The `fromConnectionString` method shall return a new instance of the `DeviceEnrollment` object.] */
    return new DeviceEnrollment(config);
  }

}
