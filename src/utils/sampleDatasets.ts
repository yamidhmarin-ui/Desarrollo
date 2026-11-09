import { SampleDatasetInfo } from '../types';

export const SAMPLE_DATASETS: SampleDatasetInfo[] = [
  {
    id: 'retail_beverages',
    title: 'Retail & Alimentos: Demanda, Precios y Publicidad',
    sector: 'Alimentos, Bebidas y Consumo Masivo',
    suggestedTarget: 'Unidades_Vendidas',
    description:
      'Dataset comercial histórico de 120 semanas de operación nacional. Analiza la elasticidad precio, retorno de campañas en medios digitales, impacto de promociones y clima en el volumen de ventas.',
    rows: 120,
    data: generateRetailData(),
  },
  {
    id: 'b2b_saas',
    title: 'B2B SaaS: Ingresos Recurrentes (MRR) & Éxito del Cliente',
    sector: 'Tecnología y Software por Suscripción',
    suggestedTarget: 'MRR_Ingreso_Mensual_USD',
    description:
      '150 cuentas corporativas B2B analizando la relación entre inversión en marketing de contenidos, presupuesto de Customer Success, NPS y adopción de usuarios con los ingresos mensuales recurrentes.',
    rows: 150,
    data: generateSaaSData(),
  },
  {
    id: 'manufacturing_ops',
    title: 'Manufactura & Operaciones: Costos Unitarios y Eficiencia',
    sector: 'Industria & Manufactura',
    suggestedTarget: 'Costo_Unitario_USD',
    description:
      '110 lotes de producción evaluando el impacto de mantenimiento predictivo, costo de materia prima, turnos de trabajo y tasa de defectos sobre el costo unitario de producto terminado.',
    rows: 110,
    data: generateManufacturingData(),
  },
];

function generateRetailData() {
  const records = [];
  const channels = ['Supermercados', 'Tiendas de Barrio', 'Ecommerce', 'Mayoristas'];

  // Seeded pseudo-random generator for reproducibility
  let seed = 12345;
  function rnd() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  const startDate = new Date(2024, 0, 8);

  for (let i = 1; i <= 120; i++) {
    const curDate = new Date(startDate);
    curDate.setDate(curDate.getDate() + i * 7);

    const channel = channels[Math.floor(rnd() * channels.length)];
    const price = Number((18 + rnd() * 8).toFixed(2)); // USD 18 - 26
    const marketing = Math.round(1500 + rnd() * 4500); // USD 1500 - 6000
    const discountPct = Number((rnd() * 25).toFixed(1)); // 0 - 25%
    const tempCelsius = Number((15 + rnd() * 18).toFixed(1)); // 15 - 33 °C
    const consumerConfidence = Number((85 + rnd() * 30).toFixed(1)); // 85 - 115 pts
    const stockAvailable = Math.round(5000 + rnd() * 3000);

    // Channel effect
    const channelBonus =
      channel === 'Supermercados' ? 800 : channel === 'Mayoristas' ? 1200 : channel === 'Ecommerce' ? 400 : 0;

    // Economic relationship:
    // Units = Base (4500) - 130 * price + 0.45 * marketing + 42 * discountPct + 18 * tempCelsius + 12 * confidence + channelBonus + noise
    const baseDemand = 4200;
    const priceEffect = -145 * price;
    const adEffect = 0.48 * marketing;
    const discountEffect = 38 * discountPct;
    const tempEffect = 15 * tempCelsius;
    const confEffect = 10 * (consumerConfidence - 100);
    const noise = (rnd() - 0.5) * 350;

    const units = Math.max(
      450,
      Math.round(
        baseDemand + priceEffect + adEffect + discountEffect + tempEffect + confEffect + channelBonus + noise
      )
    );

    records.push({
      ID_Semana: `SEM-${String(i).padStart(3, '0')}`,
      Fecha: curDate.toISOString().split('T')[0],
      Canal_Distribucion: channel,
      Precio_Unitario_USD: price,
      Inversion_Publicidad_USD: marketing,
      Descuento_Pct: discountPct,
      Temperatura_Promedio_C: tempCelsius,
      Indice_Confianza_Consumidor: consumerConfidence,
      Inventario_Disponible: stockAvailable,
      Unidades_Vendidas: units,
    });
  }

  return records;
}

function generateSaaSData() {
  const records = [];
  const tiers = ['Starter', 'Pro', 'Enterprise'];
  let seed = 54321;
  function rnd() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let i = 1; i <= 150; i++) {
    const tier = tiers[Math.floor(rnd() * tiers.length)];
    const activeUsers =
      tier === 'Enterprise'
        ? Math.round(150 + rnd() * 350)
        : tier === 'Pro'
        ? Math.round(40 + rnd() * 110)
        : Math.round(8 + rnd() * 32);

    const tenureMonths = Math.round(3 + rnd() * 45);
    const csSpend = Math.round(200 + rnd() * 1800);
    const mktgSpend = Math.round(500 + rnd() * 3500);
    const nps = Math.round(40 + rnd() * 55);
    const openTickets = Math.round(rnd() * 12);

    const tierMultiplier = tier === 'Enterprise' ? 220 : tier === 'Pro' ? 120 : 60;
    const baseMRR = 1200;
    const userEffect = activeUsers * tierMultiplier;
    const csEffect = csSpend * 1.85;
    const tenureEffect = tenureMonths * 85;
    const npsEffect = (nps - 50) * 45;
    const ticketPenalty = -openTickets * 120;
    const noise = (rnd() - 0.5) * 800;

    const mrr = Math.max(
      450,
      Math.round(baseMRR + userEffect + csEffect + tenureEffect + npsEffect + ticketPenalty + noise)
    );

    records.push({
      Empresa_ID: `CORP-${String(1000 + i)}`,
      Plan_Tier: tier,
      Usuarios_Activos: activeUsers,
      Antiguedad_Meses: tenureMonths,
      Gasto_Customer_Success_USD: csSpend,
      Inversion_Marketing_USD: mktgSpend,
      Puntaje_NPS: nps,
      Tickets_Soporte: openTickets,
      MRR_Ingreso_Mensual_USD: mrr,
    });
  }

  return records;
}

function generateManufacturingData() {
  const records = [];
  const shifts = ['Matutino', 'Vespertino', 'Nocturno'];
  let seed = 98765;
  function rnd() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let i = 1; i <= 110; i++) {
    const shift = shifts[Math.floor(rnd() * shifts.length)];
    const rawMaterialCost = Number((45 + rnd() * 25).toFixed(2)); // 45 - 70 USD
    const maintHours = Number((2 + rnd() * 18).toFixed(1)); // 2 - 20 hrs
    const lineSpeedPPM = Math.round(180 + rnd() * 120); // 180 - 300 ppm
    const oeeEfficiency = Number((68 + rnd() * 26).toFixed(1)); // 68 - 94%
    const defectsPPM = Math.round(120 + rnd() * 450);

    const shiftPenalty = shift === 'Nocturno' ? 3.5 : shift === 'Vespertino' ? 1.2 : 0;
    const baseCost = 25.0;
    const matEffect = rawMaterialCost * 0.72;
    const oeeEffect = -(oeeEfficiency - 70) * 0.45;
    const maintEffect = -maintHours * 0.35; // Preventive maintenance reduces unit scrap
    const defectEffect = (defectsPPM / 100) * 0.85;
    const noise = (rnd() - 0.5) * 2.2;

    const unitCost = Number(
      Math.max(
        15,
        baseCost + matEffect + oeeEffect + maintEffect + defectEffect + shiftPenalty + noise
      ).toFixed(2)
    );

    records.push({
      Lote_ID: `LOT-${String(5000 + i)}`,
      Turno_Operativo: shift,
      Costo_Materia_Prima_USD: rawMaterialCost,
      Horas_Mantenimiento: maintHours,
      Velocidad_Linea_PPM: lineSpeedPPM,
      Eficiencia_OEE_Pct: oeeEfficiency,
      Defectos_PPM: defectsPPM,
      Costo_Unitario_USD: unitCost,
    });
  }

  return records;
}
