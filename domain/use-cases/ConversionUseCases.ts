
import { IConversionRepository } from '../ports';
import { UnitConversion } from '../entities';

// --- USE CASE: Managing Unit Conversions ---
// This use case orchestrates all logic related to unit conversion rules.
export class ConversionUseCases {
  constructor(private conversionRepository: IConversionRepository) {}

  async getConversions(): Promise<UnitConversion[]> {
    return this.conversionRepository.getConversions();
  }

  async createConversion(conversionData: Omit<UnitConversion, 'id' | 'ingredientName'>): Promise<UnitConversion> {
    this.validateConversion(conversionData);
    return this.conversionRepository.createConversion(conversionData);
  }
  
  async updateConversion(conversion: Omit<UnitConversion, 'ingredientName'>): Promise<UnitConversion> {
    this.validateConversion(conversion);
    return this.conversionRepository.updateConversion(conversion);
  }

  async deleteConversion(conversionId: number): Promise<void> {
    if (!conversionId) {
      throw new Error('Conversion ID is required for deletion.');
    }
    return this.conversionRepository.deleteConversion(conversionId);
  }

  private validateConversion(data: Omit<UnitConversion, 'id' | 'ingredientName'>) {
    if (!data.fromUnit?.trim() || !data.toUnit?.trim()) {
      throw new Error('Both "From Unit" and "To Unit" are required.');
    }
     if (data.fromUnit.trim().toLowerCase() === data.toUnit.trim().toLowerCase()) {
      throw new Error('Cannot convert a unit to itself.');
    }
    if (isNaN(data.factor) || data.factor <= 0) {
      throw new Error('Conversion factor must be a positive number.');
    }
  }
}
