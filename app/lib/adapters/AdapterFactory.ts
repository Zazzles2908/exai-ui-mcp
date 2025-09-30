/**
 * Adapter Factory
 * 
 * Creates appropriate adapter instances based on configuration.
 * Supports switching between local and Supabase modes.
 */

import { IExaiAdapter } from './interfaces/IExaiAdapter'
import { IDatabaseAdapter } from './interfaces/IDatabaseAdapter'
import { LocalExaiAdapter } from './implementations/LocalExaiAdapter'
import { LocalDatabaseAdapter } from './implementations/LocalDatabaseAdapter'
import { prisma } from '../db'

export type AdapterMode = 'local' | 'supabase'

export class AdapterFactory {
  private static exaiAdapter: IExaiAdapter | null = null
  private static databaseAdapter: IDatabaseAdapter | null = null
  private static currentMode: AdapterMode | null = null

  /**
   * Get the current adapter mode from environment variables
   */
  static getMode(): AdapterMode {
    const mode = process.env.ADAPTER_MODE as AdapterMode
    if (mode !== 'local' && mode !== 'supabase') {
      console.warn(`Invalid ADAPTER_MODE: ${mode}. Defaulting to 'local'`)
      return 'local'
    }
    return mode
  }

  /**
   * Create or get EXAI adapter instance
   */
  static getExaiAdapter(): IExaiAdapter {
    const mode = this.getMode()

    // Return cached adapter if mode hasn't changed
    if (this.exaiAdapter && this.currentMode === mode) {
      return this.exaiAdapter
    }

    // Create new adapter based on mode
    switch (mode) {
      case 'local':
        const daemonUrl = process.env.EXAI_DAEMON_URL || 'http://127.0.0.1:8765'
        const timeout = parseInt(process.env.EXAI_TIMEOUT || '300000', 10)
        this.exaiAdapter = new LocalExaiAdapter(daemonUrl, timeout)
        break

      case 'supabase':
        // TODO: Implement SupabaseExaiAdapter when migrating to Supabase
        throw new Error('Supabase EXAI adapter not yet implemented')

      default:
        throw new Error(`Unsupported adapter mode: ${mode}`)
    }

    this.currentMode = mode
    return this.exaiAdapter
  }

  /**
   * Create or get Database adapter instance
   */
  static getDatabaseAdapter(): IDatabaseAdapter {
    const mode = this.getMode()

    // Return cached adapter if mode hasn't changed
    if (this.databaseAdapter && this.currentMode === mode) {
      return this.databaseAdapter
    }

    // Create new adapter based on mode
    switch (mode) {
      case 'local':
        this.databaseAdapter = new LocalDatabaseAdapter(prisma)
        break

      case 'supabase':
        // TODO: Implement SupabaseDatabaseAdapter when migrating to Supabase
        throw new Error('Supabase database adapter not yet implemented')

      default:
        throw new Error(`Unsupported adapter mode: ${mode}`)
    }

    this.currentMode = mode
    return this.databaseAdapter
  }

  /**
   * Reset adapters (useful for testing or mode switching)
   */
  static reset(): void {
    this.exaiAdapter = null
    this.databaseAdapter = null
    this.currentMode = null
  }

  /**
   * Health check for both adapters
   */
  static async healthCheck(): Promise<{
    exai: boolean
    database: boolean
    mode: AdapterMode
  }> {
    const mode = this.getMode()
    const exaiAdapter = this.getExaiAdapter()
    const databaseAdapter = this.getDatabaseAdapter()

    const [exaiHealth, dbHealth] = await Promise.all([
      exaiAdapter.healthCheck().catch(() => false),
      databaseAdapter.healthCheck().catch(() => false),
    ])

    return {
      exai: exaiHealth,
      database: dbHealth,
      mode,
    }
  }
}

// Convenience exports
export const getExaiAdapter = () => AdapterFactory.getExaiAdapter()
export const getDatabaseAdapter = () => AdapterFactory.getDatabaseAdapter()
export const getAdapterMode = () => AdapterFactory.getMode()
export const checkAdapterHealth = () => AdapterFactory.healthCheck()

