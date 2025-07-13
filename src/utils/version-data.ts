/**
 * Shared types and constants for version data handling
 */

/**
 * Interface for version data in provider statistics
 */
export interface VersionData {
  updated: string;
  added: string;
  [key: string]: any; // Allow additional properties for flexibility
}

/**
 * Constants for default date values
 */
export const EPOCH_DATE = new Date(0);
export const DEFAULT_DATE = EPOCH_DATE;
