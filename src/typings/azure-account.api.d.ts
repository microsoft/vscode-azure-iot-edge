/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* tslint:disable */
import { Event, Terminal, Progress, CancellationToken } from 'vscode';
import { ServiceClientCredentials } from '@azure/ms-rest-js';
import { Subscription } from "@azure/arm-resources-subscriptions";
import { ReadStream } from 'fs';

export type AzureLoginStatus = 'Initializing' | 'LoggingIn' | 'LoggedIn' | 'LoggedOut';

export type AzureEnvironmentParameters = {
	/**
	 * The Environment name.
	 */
	name: string;

	/**
	 * The management portal URL.
	 */
	portalUrl: string;

	/**
	 * The management service endpoint.
	 */
	managementEndpointUrl: string;

	/**
	 * The resource management endpoint.
	 */
	resourceManagerEndpointUrl: string;

	/**
	 * The Active Directory login endpoint.
	 */
	activeDirectoryEndpointUrl: string;

	/**
	 * The resource ID to obtain AD tokens for (token audience).
	 */
	activeDirectoryResourceId: string;

	/**
	 * The publish settings file URL.
	 */
	publishingProfileUrl: string;

	/**
	 * The sql server management endpoint for mobile commands.
	 */
	sqlManagementEndpointUrl: string;

	/**
	 * The dns suffix for sql servers.
	 */
	sqlServerHostnameSuffix: string;

	/**
	 * The template gallery endpoint.
	 */
	galleryEndpointUrl: string;

	/**
	 * The Active Directory Graph resource ID.
	 */
	activeDirectoryGraphResourceId: string;

	/**
	 * The Azure Batch resource ID.
	 */
	batchResourceId: string;

	/**
	 * The Active Directory api version.
	 */
	activeDirectoryGraphApiVersion: string;

	/**
	 * The endpoint suffix for storage accounts.
	 */
	storageEndpointSuffix: string;

	/**
	 * The keyvault service dns suffix.
	 */
	keyVaultDnsSuffix: string;

	/**
	 * The data lake store filesystem service dns suffix.
	 */
	azureDataLakeStoreFileSystemEndpointSuffix: string;

	/**
	 * The data lake analytics job and catalog service dns suffix.
	 */
	azureDataLakeAnalyticsCatalogAndJobEndpointSuffix: string;

	/**
	 * Determines whether the authentication endpoint should be validated with Azure AD. Default value is true.
	 */
	validateAuthority: boolean;
};

export class AzureEnvironment {
	/**
	 * The Environment name.
	 */
	name: string;

	/**
	 * The management portal URL.
	 */
	portalUrl: string;

	/**
	 * The management service endpoint.
	 */
	managementEndpointUrl: string;

	/**
	 * The resource management endpoint.
	 */
	resourceManagerEndpointUrl: string;

	/**
	 * The Active Directory login endpoint.
	 */
	activeDirectoryEndpointUrl: string;

	/**
	 * The resource ID to obtain AD tokens for (token audience).
	 */
	activeDirectoryResourceId: string;

	/**
	 * The publish settings file URL.
	 */
	publishingProfileUrl: string;

	/**
	 * The sql server management endpoint for mobile commands.
	 */
	sqlManagementEndpointUrl: string;

	/**
	 * The dns suffix for sql servers.
	 */
	sqlServerHostnameSuffix: string;

	/**
	 * The template gallery endpoint.
	 */
	galleryEndpointUrl: string;

	/**
	 * The Active Directory resource ID.
	 */
	activeDirectoryGraphResourceId: string;

	/**
	 * The Active Directory api version.
	 */
	activeDirectoryGraphApiVersion: string;

	/**
	 * The endpoint suffix for storage accounts.
	 */
	storageEndpointSuffix: string;

	/**
	 * The keyvault service dns suffix.
	 */
	keyVaultDnsSuffix: string;

	/**
	 * The data lake store filesystem service dns suffix.
	 */
	azureDataLakeStoreFileSystemEndpointSuffix: string;

	/**
	 * The data lake analytics job and catalog service dns suffix.
	 */
	azureDataLakeAnalyticsCatalogAndJobEndpointSuffix: string;

	/**
	 * Determines whether the authentication endpoint should be validated with Azure AD. Default value is true.
	 */
	validateAuthority: boolean;

	/**
	 * Initializes a new instance of the AzureEnvironment class.
	 * @param {string} parameters.name - The Environment name
	 * @param {string} parameters.portalUrl - The management portal URL
	 * @param {string} parameters.managementEndpointUrl - The management service endpoint
	 * @param {string} parameters.resourceManagerEndpointUrl - The resource management endpoint
	 * @param {string} parameters.activeDirectoryEndpointUrl - The Active Directory login endpoint
	 * @param {string} parameters.activeDirectoryResourceId - The resource ID to obtain AD tokens for (token audience)
	 * @param {string} [parameters.publishingProfileUrl] - The publish settings file URL
	 * @param {string} [parameters.sqlManagementEndpointUrl] - The sql server management endpoint for mobile commands
	 * @param {string} [parameters.sqlServerHostnameSuffix] - The dns suffix for sql servers
	 * @param {string} [parameters.galleryEndpointUrl] - The template gallery endpoint
	 * @param {string} [parameters.activeDirectoryGraphResourceId] - The Active Directory resource ID
	 * @param {string} [parameters.batchResourceId] - The Azure Batch resource ID
	 * @param {string} [parameters.activeDirectoryGraphApiVersion] - The Active Directory api version
	 * @param {string} [parameters.storageEndpointSuffix] - The endpoint suffix for storage accounts
	 * @param {string} [parameters.keyVaultDnsSuffix] - The keyvault service dns suffix
	 * @param {string} [parameters.azureDataLakeStoreFileSystemEndpointSuffix] - The data lake store filesystem service dns suffix
	 * @param {string} [parameters.azureDataLakeAnalyticsCatalogAndJobEndpointSuffix] - The data lake analytics job and catalog service dns suffix
	 * @param {bool} [parameters.validateAuthority] - Determines whether the authentication endpoint should 
	 * be validated with Azure AD. Default value is true.
	 */
	constructor(parameters: AzureEnvironmentParameters);
}

export interface AzureAccount {
	readonly status: AzureLoginStatus;
	readonly onStatusChanged: Event<AzureLoginStatus>;
	readonly waitForLogin: () => Promise<boolean>;
	readonly sessions: AzureSession[];
	readonly onSessionsChanged: Event<void>;
	readonly subscriptions: AzureSubscription[];
	readonly onSubscriptionsChanged: Event<void>;
	readonly waitForSubscriptions: () => Promise<boolean>;
	readonly filters: AzureResourceFilter[];
	readonly onFiltersChanged: Event<void>;
	readonly waitForFilters: () => Promise<boolean>;
	createCloudShell(os: 'Linux' | 'Windows'): CloudShell;
}

export interface AzureSession {
	readonly environment: AzureEnvironment;
	readonly userId: string;
	readonly tenantId: string;
	readonly credentials: ServiceClientCredentials;
}

export interface AzureSubscription {
	readonly session: AzureSession;
	readonly subscription: Subscription;
}

export type AzureResourceFilter = AzureSubscription;

export type CloudShellStatus = 'Connecting' | 'Connected' | 'Disconnected';

export interface UploadOptions {
	contentLength?: number;
	progress?: Progress<{ message?: string; increment?: number }>;
	token?: CancellationToken;
}

export interface CloudShell {
	readonly status: CloudShellStatus;
	readonly onStatusChanged: Event<CloudShellStatus>;
	readonly waitForConnection: () => Promise<boolean>;
	readonly terminal: Promise<Terminal>;
	readonly session: Promise<AzureSession>;
	readonly uploadFile: (filename: string, stream: ReadStream, options?: UploadOptions) => Promise<void>;
}
