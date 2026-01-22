/**
 * @fileoverview sperax module implementation
 * @copyright Copyright (c) 2024-2026 nirholas
 * @license MIT
 */

import type { ToolHandler } from '../blockchain/index.js';
import type { ToolResponse } from '../../../types.js';
import { getBSCClient } from '../../../services/bsc.js';
import { SperaxClient, SPERAX_ADDRESSES } from '../../../services/sperax.js';

export const speraxTools: ToolHandler[] = [
    // Get vault information
    {
        definition: {
            name: 'sperax_get_vault_info',
            description: 'Get Sperax vault information including total collateral, USDs supply, collateral ratio, and supported collaterals (USDT, BUSD, USDC)',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        },
        handler: async (): Promise<ToolResponse<any>> => {
            try {
                const bscClient = await getBSCClient();
                const speraxClient = new SperaxClient(bscClient.getProvider());
                
                const vaultInfo = await speraxClient.getVaultInfo();
                const apy = await speraxClient.getCurrentAPY();

                return {
                    success: true,
                    data: {
                        ...vaultInfo,
                        currentAPY: apy,
                        protocol: 'Sperax USDs',
                        description: 'Auto-yield stablecoin - balance increases automatically',
                    },
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get vault info',
                };
            }
        },
    },

    // Get user position
    {
        definition: {
            name: 'sperax_get_position',
            description: 'Get user USDs position including balance, rebasing status, and estimated annual yield',
            inputSchema: {
                type: 'object',
                properties: {
                    address: {
                        type: 'string',
                        description: 'Wallet address',
                    },
                },
                required: ['address'],
            },
        },
        handler: async (args): Promise<ToolResponse<any>> => {
            try {
                const { address } = args as { address: string };

                const bscClient = await getBSCClient();
                const speraxClient = new SperaxClient(bscClient.getProvider());
                
                const position = await speraxClient.getUserPosition(address);

                return {
                    success: true,
                    data: position,
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get position',
                };
            }
        },
    },

    // Mint USDs
    {
        definition: {
            name: 'sperax_mint',
            description: 'Mint USDs by depositing collateral (USDT, BUSD, or USDC). USDs automatically earns yield through rebasing.',
            inputSchema: {
                type: 'object',
                properties: {
                    collateral: {
                        type: 'string',
                        enum: ['USDT', 'BUSD', 'USDC'],
                        description: 'Collateral token to deposit',
                    },
                    amount: {
                        type: 'string',
                        description: 'Amount of collateral to deposit',
                    },
                    minUSDs: {
                        type: 'string',
                        description: 'Minimum USDs to receive (slippage protection)',
                    },
                },
                required: ['collateral', 'amount', 'minUSDs'],
            },
        },
        handler: async (args): Promise<ToolResponse<{ txHash: string }>> => {
            try {
                const { collateral, amount, minUSDs } = args as { 
                    collateral: string; 
                    amount: string; 
                    minUSDs: string;
                };

                const collateralAddress = SPERAX_ADDRESSES[collateral as keyof typeof SPERAX_ADDRESSES];
                if (!collateralAddress) {
                    throw new Error(`Invalid collateral: ${collateral}`);
                }

                const bscClient = await getBSCClient();
                const speraxClient = new SperaxClient(bscClient.getProvider(), bscClient.getWallet());
                
                const txHash = await speraxClient.mintUSDs(collateralAddress, amount, minUSDs);

                return {
                    success: true,
                    data: { txHash },
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to mint USDs',
                };
            }
        },
    },

    // Redeem USDs
    {
        definition: {
            name: 'sperax_redeem',
            description: 'Redeem USDs for underlying collateral. Burns USDs and returns USDT/BUSD/USDC.',
            inputSchema: {
                type: 'object',
                properties: {
                    amount: {
                        type: 'string',
                        description: 'Amount of USDs to redeem',
                    },
                    minCollateral: {
                        type: 'string',
                        description: 'Minimum collateral to receive (slippage protection)',
                    },
                },
                required: ['amount', 'minCollateral'],
            },
        },
        handler: async (args): Promise<ToolResponse<{ txHash: string }>> => {
            try {
                const { amount, minCollateral } = args as { amount: string; minCollateral: string };

                const bscClient = await getBSCClient();
                const speraxClient = new SperaxClient(bscClient.getProvider(), bscClient.getWallet());
                
                const txHash = await speraxClient.redeemUSDs(amount, minCollateral);

                return {
                    success: true,
                    data: { txHash },
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to redeem USDs',
                };
            }
        },
    },

    // Get current APY
    {
        definition: {
            name: 'sperax_get_apy',
            description: 'Get current USDs APY. USDs automatically earns yield - no staking required.',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        },
        handler: async (): Promise<ToolResponse<any>> => {
            try {
                const bscClient = await getBSCClient();
                const speraxClient = new SperaxClient(bscClient.getProvider());
                
                const apy = await speraxClient.getCurrentAPY();

                return {
                    success: true,
                    data: { 
                        apy,
                        note: 'USDs auto-rebases - yield is automatically added to your balance',
                    },
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to get APY',
                };
            }
        },
    },

    // Opt into rebasing
    {
        definition: {
            name: 'sperax_opt_in_rebasing',
            description: 'Opt-in to USDs rebasing (auto-yield). Your balance will automatically increase with accrued yield.',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        },
        handler: async (): Promise<ToolResponse<any>> => {
            try {
                const bscClient = await getBSCClient();
                const speraxClient = new SperaxClient(bscClient.getProvider(), bscClient.getWallet());
                
                const txHash = await speraxClient.optIntoRebasing();

                return {
                    success: true,
                    data: { 
                        txHash,
                        note: 'Rebasing enabled - your USDs balance will now increase automatically',
                    },
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to opt-in to rebasing',
                };
            }
        },
    },

    // Opt out of rebasing
    {
        definition: {
            name: 'sperax_opt_out_rebasing',
            description: 'Opt-out of USDs rebasing. Your balance will remain fixed (useful for trading/LP).',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        },
        handler: async (): Promise<ToolResponse<any>> => {
            try {
                const bscClient = await getBSCClient();
                const speraxClient = new SperaxClient(bscClient.getProvider(), bscClient.getWallet());
                
                const txHash = await speraxClient.optOutOfRebasing();

                return {
                    success: true,
                    data: { 
                        txHash,
                        note: 'Rebasing disabled - your USDs balance will remain constant',
                    },
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to opt-out of rebasing',
                };
            }
        },
    },

    // Get estimated mint amount
    {
        definition: {
            name: 'sperax_get_mint_estimate',
            description: 'Calculate how much USDs you can mint with your collateral',
            inputSchema: {
                type: 'object',
                properties: {
                    collateral: {
                        type: 'string',
                        enum: ['USDT', 'BUSD', 'USDC'],
                        description: 'Collateral token',
                    },
                    amount: {
                        type: 'string',
                        description: 'Amount of collateral',
                    },
                },
                required: ['collateral', 'amount'],
            },
        },
        handler: async (args): Promise<ToolResponse<any>> => {
            try {
                const { collateral, amount } = args as { collateral: string; amount: string };

                const collateralAddress = SPERAX_ADDRESSES[collateral as keyof typeof SPERAX_ADDRESSES];
                if (!collateralAddress) {
                    throw new Error(`Invalid collateral: ${collateral}`);
                }

                const bscClient = await getBSCClient();
                const speraxClient = new SperaxClient(bscClient.getProvider());
                
                const estimatedUSDs = await speraxClient.getEstimatedMintAmount(collateralAddress, amount);

                return {
                    success: true,
                    data: {
                        collateral,
                        collateralAmount: amount,
                        estimatedUSDs,
                        fee: '~1%',
                        note: 'Actual amount may vary slightly based on vault conditions',
                    },
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to estimate mint amount',
                };
            }
        },
    },
];
