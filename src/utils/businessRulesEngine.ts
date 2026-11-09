import { BusinessRule, ColumnProfile } from '../types';

export function inferBusinessRules(
  profiles: ColumnProfile[],
  targetCol: string
): BusinessRule[] {
  const rules: BusinessRule[] = [];
  const targetLower = targetCol.toLowerCase();

  for (const prof of profiles) {
    if (prof.name === targetCol || prof.isIdentifier || prof.isDate || prof.type === 'irrelevant') {
      continue;
    }

    const colLower = prof.name.toLowerCase();
    let expectedSign: 'positive' | 'negative' | 'ambiguous' = 'ambiguous';
    let businessRationale = 'Relación exploratoria basada en correlación empírica.';
    let isControllable = false;

    // 1. Price vs Demand / Units
    if (
      colLower.includes('precio') ||
      colLower.includes('price') ||
      colLower.includes('tarifa')
    ) {
      isControllable = true;
      if (
        targetLower.includes('unidad') ||
        targetLower.includes('venta') ||
        targetLower.includes('demanda') ||
        targetLower.includes('mrr')
      ) {
        expectedSign = 'negative';
        businessRationale =
          'Ley de la Demanda: Todo incremento en el precio suele contraer el volumen de demanda ceteris paribus (elasticidad precio de la demanda negativa).';
      } else if (targetLower.includes('ingreso') || targetLower.includes('facturacion')) {
        expectedSign = 'ambiguous';
        businessRationale =
          'Efecto precio vs efecto volumen: El impacto neto en ingresos depende de si la demanda es elástica o inelástica (|ε| > 1).';
      }
    }

    // 2. Marketing / Advertising
    else if (
      colLower.includes('publicidad') ||
      colLower.includes('marketing') ||
      colLower.includes('ads') ||
      colLower.includes('pauta') ||
      colLower.includes('ad_spend')
    ) {
      isControllable = true;
      expectedSign = 'positive';
      businessRationale =
        'Inversión en Adquisición: El presupuesto en medios genera conocimiento de marca, tráfico y conversión comercial (efecto positivo esperado).';
    }

    // 3. Discount / Promotion
    else if (
      colLower.includes('descuento') ||
      colLower.includes('discount') ||
      colLower.includes('promo')
    ) {
      isControllable = true;
      expectedSign = 'positive';
      businessRationale =
        'Estímulo promocional: Un mayor descuento incentiva la conversión y rotación de inventarios en el corto plazo.';
    }

    // 4. Customer Success / Retention
    else if (
      colLower.includes('customer_success') ||
      colLower.includes('servicio') ||
      colLower.includes('soporte') ||
      colLower.includes('nps')
    ) {
      isControllable = colLower.includes('gasto') || colLower.includes('presupuesto');
      expectedSign = 'positive';
      businessRationale =
        'Satisfacción y Retención: Mayor inversión en retención eleva el valor de vida del cliente (LTV) y reduce la tasa de cancelación.';
    }

    // 5. Defects / Tickets / Scrap
    else if (
      colLower.includes('defecto') ||
      colLower.includes('ticket') ||
      colLower.includes('reclamo') ||
      colLower.includes('scrap') ||
      colLower.includes('error')
    ) {
      isControllable = false;
      if (targetLower.includes('costo') || targetLower.includes('cost')) {
        expectedSign = 'positive';
        businessRationale =
          'Costos de No Calidad: A mayor tasa de defectos o quejas, mayores reprocesos, penalizaciones y costo unitario.';
      } else {
        expectedSign = 'negative';
        businessRationale =
          'Fricción operativa: Incidencias de calidad erosionan la satisfacción del cliente y la demanda.';
      }
    }

    // 6. Raw Material Cost / Direct Cost
    else if (
      colLower.includes('materia_prima') ||
      colLower.includes('material') ||
      colLower.includes('costo_directo')
    ) {
      isControllable = false;
      expectedSign = 'positive';
      businessRationale =
        'Estructura de Costos: Un alza en los insumos básicos se traslada directamente al costo de producción.';
    }

    // 7. Efficiency / OEE
    else if (
      colLower.includes('eficiencia') ||
      colLower.includes('oee') ||
      colLower.includes('productividad')
    ) {
      isControllable = true;
      if (targetLower.includes('costo') || targetLower.includes('cost')) {
        expectedSign = 'negative';
        businessRationale =
          'Economías de Escala y Eficiencia: Una mayor tasa OEE diluye costos fijos y reduce el costo medio unitario.';
      } else {
        expectedSign = 'positive';
        businessRationale = 'Mayor productividad expande la capacidad de entrega y facturación.';
      }
    }

    // 8. Maintenance
    else if (
      colLower.includes('mantenimiento') ||
      colLower.includes('maintenance')
    ) {
      isControllable = true;
      if (targetLower.includes('costo')) {
        expectedSign = 'negative';
        businessRationale =
          'Mantenimiento Preventivo: Mitiga paradas imprevistas no programadas y mermas costosas en planta.';
      }
    }

    // 9. External macro variables
    else if (
      colLower.includes('confianza') ||
      colLower.includes('temperatura') ||
      colLower.includes('pib') ||
      colLower.includes('inflacion') ||
      colLower.includes('clima')
    ) {
      isControllable = false;
      expectedSign = colLower.includes('inflacion') ? 'negative' : 'positive';
      businessRationale =
        'Variable Macroeconómica / Exógena: Contexto ambiental o económico que impacta la propensión de compra.';
    }

    // Define reasonable simulation boundaries based on observed historical data
    let minAllowed = prof.min !== undefined ? Math.max(0, prof.min * 0.7) : 0;
    let maxAllowed = prof.max !== undefined ? prof.max * 1.5 : 100000;

    // For percentage variables, clamp between 0% and 100%
    if (colLower.includes('pct') || colLower.includes('porcentaje') || colLower.includes('descuento')) {
      minAllowed = 0;
      maxAllowed = Math.min(100, (prof.max || 25) * 1.5);
    }

    rules.push({
      id: `rule_${prof.name}`,
      variableName: prof.name,
      targetVariable: targetCol,
      expectedSign,
      businessRationale,
      minAllowedValue: Number(minAllowed.toFixed(1)),
      maxAllowedValue: Number(maxAllowed.toFixed(1)),
      isControllable,
      confirmedByUser: true,
    });
  }

  return rules;
}
