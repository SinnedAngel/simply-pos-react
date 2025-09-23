import { SupabaseClient } from '@supabase/supabase-js';
import { Database, RpcConversion } from '../types';
import { UnitConversion } from '../domain/entities';
import { IConversionRepository } from '../domain/ports';

// --- ADAPTER: Conversion Repository ---
// Implements the IConversionRepository port for unit conversion management.
export class ConversionRepository implements IConversionRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  private getErrorMessage(error: any, defaultMessage: string): string {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String(error.message);
    }
    return defaultMessage;
  }

  private mapRpcToEntity(rpc: RpcConversion): UnitConversion {
    return {
        id: rpc.id,
        fromUnit: rpc.from_unit,
        toUnit: rpc.to_unit,
        factor: rpc.factor,
        ingredientId: rpc.ingredient_id,
        ingredientName: rpc.ingredient_name
    };
  }

  async getConversions(): Promise<UnitConversion[]> {
    const { data, error } = await this.supabase.rpc('get_all_conversions');
    if (error) {
        console.error('Error fetching conversions:', error);
        throw new Error(`Failed to get conversions: ${this.getErrorMessage(error, 'Unknown error')}`);
    }
    return ((data as RpcConversion[]) ?? []).map(this.mapRpcToEntity);
  }

  async createConversion(conversion: Omit<UnitConversion, 'id' | 'ingredientName'>): Promise<UnitConversion> {
    const { error } = await this.supabase.rpc('create_conversion', {
      p_from_unit: conversion.fromUnit,
      p_to_unit: conversion.toUnit,
      p_factor: conversion.factor,
      p_ingredient_id: conversion.ingredientId || undefined,
    });
    if (error) {
      if (error.message.includes('duplicate key value violates unique constraint "unit_conversions_from_unit_to_unit_ingredient_id_key"')) {
        throw new Error('This specific conversion rule already exists.');
      }
      console.error('Error creating conversion:', error);
      throw new Error(`Failed to create conversion: ${this.getErrorMessage(error, 'Unknown error')}`);
    }
    // Since we don't get the created object back, we refetch to stay in sync
    // In a real app, you might return the created ID from the RPC.
    const conversions = await this.getConversions();
    const newConversion = conversions.find(c => 
        c.fromUnit === conversion.fromUnit &&
        c.toUnit === conversion.toUnit &&
        c.ingredientId === conversion.ingredientId
    );
    if (!newConversion) {
        throw new Error('Conversion was created, but could not be retrieved.');
    }
    return newConversion;
  }
  
  async updateConversion(conversion: Omit<UnitConversion, 'ingredientName'>): Promise<UnitConversion> {
      const { error } = await this.supabase.rpc('update_conversion', {
          p_id: conversion.id,
          p_from_unit: conversion.fromUnit,
          p_to_unit: conversion.toUnit,
          p_factor: conversion.factor,
          p_ingredient_id: conversion.ingredientId || undefined,
      });

      if (error) {
        if (error.message.includes('duplicate key value violates unique constraint "unit_conversions_from_unit_to_unit_ingredient_id_key"')) {
            throw new Error('This specific conversion rule already exists.');
        }
        console.error('Error updating conversion:', error);
        throw new Error(`Failed to update conversion: ${this.getErrorMessage(error, 'Unknown error')}`);
      }
      // Return the updated object as passed in, assuming success
      return { ...conversion, ingredientName: null };
  }

  async deleteConversion(conversionId: number): Promise<void> {
    const { error } = await this.supabase.rpc('delete_conversion', { p_id: conversionId });
    if (error) {
        console.error('Error deleting conversion:', error);
        throw new Error(`Failed to delete conversion: ${this.getErrorMessage(error, 'Unknown error')}`);
    }
  }
}