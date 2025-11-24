/**
 * Brand Kit API Client
 * Frontend client for managing brand kits
 */

import { api } from '@/lib/api-client';

export interface BrandColor {
  hex: string;
  name: string;
  type?: string;
  usage: string;
}

export interface Font {
  family: string;
  type?: string;
  origin?: string;
  originId?: string;
  weights?: number[];
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  [key: string]: string | undefined;
}

export interface BrandKit {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;

  // Source
  sourceType: 'website' | 'facebook' | 'instagram' | 'manual';
  sourceUrl?: string;

  // Brand Assets
  logoUrl?: string;
  logoSvg?: string;
  brandColors: BrandColor[];
  fonts: Font[];

  // Company Info
  companyName?: string;
  tagline?: string;
  industry?: string;
  description?: string;

  // Contact
  phone?: string;
  email?: string;
  websiteUrl?: string;
  socialLinks: SocialLinks;

  // Metadata
  extractionStatus: 'pending' | 'completed' | 'failed' | 'manual';
  extractionMetadata: Record<string, any>;
  lastSyncedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandKitInput {
  name: string;
  sourceType?: 'manual';
  logoUrl?: string;
  logoSvg?: string;
  brandColors?: BrandColor[];
  fonts?: Font[];
  companyName?: string;
  tagline?: string;
  industry?: string;
  description?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  socialLinks?: SocialLinks;
  isDefault?: boolean;
}

export interface ExtractBrandKitInput {
  url: string;
  name?: string;
  isDefault?: boolean;
}

export interface UpdateBrandKitInput {
  name?: string;
  logoUrl?: string;
  logoSvg?: string;
  brandColors?: BrandColor[];
  fonts?: Font[];
  companyName?: string;
  tagline?: string;
  industry?: string;
  description?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  socialLinks?: SocialLinks;
  isDefault?: boolean;
}

/**
 * List all brand kits for current user
 */
export async function listBrandKits(): Promise<BrandKit[]> {
  const response = await api.get('/api/user/brand-kits');
  return response.data || [];
}

/**
 * Get a specific brand kit by ID
 */
export async function getBrandKit(id: string): Promise<BrandKit> {
  const response = await api.get(`/api/user/brand-kits/${id}`);
  return response.data;
}

/**
 * Get user's default brand kit
 */
export async function getDefaultBrandKit(): Promise<BrandKit | null> {
  const response = await api.get('/api/user/brand-kits/default');
  return response.data;
}

/**
 * Create a manual brand kit
 */
export async function createBrandKit(input: CreateBrandKitInput): Promise<BrandKit> {
  const response = await api.post('/api/user/brand-kits', input);
  return response.data;
}

/**
 * Extract brand kit from a website URL
 */
export async function extractBrandKit(input: ExtractBrandKitInput): Promise<BrandKit> {
  const response = await api.post('/api/user/brand-kits/extract', input);
  return response.data;
}

/**
 * Update a brand kit
 */
export async function updateBrandKit(
  id: string,
  input: UpdateBrandKitInput
): Promise<BrandKit> {
  const response = await api.put(`/api/user/brand-kits/${id}`, input);
  return response.data;
}

/**
 * Set a brand kit as default
 */
export async function setDefaultBrandKit(id: string): Promise<BrandKit> {
  const response = await api.post(`/api/user/brand-kits/${id}/set-default`, {});
  return response.data;
}

/**
 * Refresh brand kit from source URL
 */
export async function refreshBrandKit(id: string): Promise<BrandKit> {
  const response = await api.post(`/api/user/brand-kits/${id}/refresh`, {});
  return response.data;
}

/**
 * Delete a brand kit
 */
export async function deleteBrandKit(id: string): Promise<void> {
  await api.delete(`/api/user/brand-kits/${id}`);
}
