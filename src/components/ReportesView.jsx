import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext.jsx';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Building2,
  CreditCard,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Loader2
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const ReportesView = () => {
  const { currentUser } = useContext(AuthContext);
  const [reportes, setReportes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [selectedTrendPeriod, setSelectedTrendPeriod] = useState('semana'); // NUEVO: Filtro de período para confirmados/rechazados

  const isSupabaseConnected = !!currentUser;

  // Función para traducir días y meses al español
  const translateDayToSpanish = (dayText) => {
    const translations = {
      // Días de la semana (abreviados)
      'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mié', 'Thu': 'Jue',
      'Fri': 'Vie', 'Sat': 'Sáb', 'Sun': 'Dom',
      // Meses completos
      'January': 'Enero', 'February': 'Febrero', 'March': 'Marzo',
      'April': 'Abril', 'May': 'Mayo', 'June': 'Junio',
      'July': 'Julio', 'August': 'Agosto', 'September': 'Septiembre',
      'October': 'Octubre', 'November': 'Noviembre', 'December': 'Diciembre',
      // Meses abreviados
      'Jan': 'Ene', 'Feb': 'Feb', 'Mar': 'Mar', 'Apr': 'Abr',
      'Jun': 'Jun', 'Jul': 'Jul', 'Aug': 'Ago', 'Sep': 'Sep',
      'Oct': 'Oct', 'Nov': 'Nov', 'Dec': 'Dic'
    };

    let translated = dayText;
    Object.keys(translations).forEach(eng => {
      translated = translated.replace(eng, translations[eng]);
    });
    return translated;
  };

  // Función para exportar a PDF capturando toda la página
  const handleExportPDF = async () => {
    try {
      // Buscar el contenedor principal de reportes
      const reportContainer = document.querySelector('.p-6.bg-gray-50');
      
      if (!reportContainer) {
        alert('No se pudo encontrar el contenido para exportar');
        return;
      }

      // Capturar el contenido como imagen
      const canvas = await html2canvas(reportContainer, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Crear PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calcular dimensiones de la imagen
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Añadir la primera página
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Si la imagen es más alta que una página, añadir más páginas
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Guardar PDF
      pdf.save(`Reporte_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Hubo un error al generar el PDF. Por favor, intenta nuevamente.');
    }
  };

  const fetchReports = React.useCallback(async (isBackground = false) => {
    if (!isSupabaseConnected) {
      setLoading(false);
      return;
    }

    try {
      if (!isBackground) setLoading(true);

      const response = await fetch(`/api/reportes/summary?trendPeriod=${selectedTrendPeriod}`);
      if (!response.ok) throw new Error("No se pudieron cargar los reportes");
      const reportData = await response.json();

      setReportes({
        summary: reportData.summary || [],
        bySucursal: reportData.bySucursal || [],
        byBanco: reportData.byBanco || [],
        trends: reportData.trends || [],
        confirmedRejectedUSD: reportData.confirmedRejectedUSD || [],
        confirmedRejectedPEN: reportData.confirmedRejectedPEN || [],
        topSucursales: reportData.topSucursales || [],
        rejectedBySucursal: reportData.rejectedBySucursal || []
      });

    } catch (error) {
      console.error('Error al cargar reportes:', error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [isSupabaseConnected, selectedTrendPeriod]);

  // Carga inicial y cuando cambian filtros
  useEffect(() => {
    fetchReports(false);
  }, [fetchReports]);

  if (!isSupabaseConnected) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">
            Conecta tu proyecto de Supabase para ver los reportes.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  const percentageValidated = reportes?.summary?.cantidad_depositos > 0
    ? ((reportes.summary.depositos_validados / reportes.summary.cantidad_depositos) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Reportes y Análisis
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
            Dashboard financiero y estadísticas de depósitos.
          </p>
        </div>
      </div>
      <div className="flex space-x-2">
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="mes">Este Mes</option>
          <option value="semana">Esta Semana</option>
          <option value="hoy">Hoy</option>
        </select>
        <button 
          onClick={handleExportPDF}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center space-x-2 transition-colors"
        >
          <Download size={16} />
          <span>Exportar</span>
        </button>
      </div>
      </div>

      {/* Summary Cards - Separadas por moneda */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Depósitos USD */}
        <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-gray-800 dark:to-gray-800 rounded-lg p-6 border border-emerald-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 font-semibold">💵 Total USD</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                $ {(() => {
                  const usdData = (reportes?.summary && Array.isArray(reportes.summary))
                    ? reportes.summary.find(s => s.moneda === 'USD')
                    : null;
                  return (usdData?.total_depositos || 0).toLocaleString('es-PE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  });
                })()}
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
          </div>
        </div>

        {/* Total Depósitos PEN */}
        <div className="bg-gradient-to-br from-amber-50 to-white dark:from-gray-800 dark:to-gray-800 rounded-lg p-6 border border-amber-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-1 font-semibold">💰 Total PEN</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                S/ {(() => {
                  const penData = (reportes?.summary && Array.isArray(reportes.summary))
                    ? reportes.summary.find(s => s.moneda === 'PEN')
                    : null;
                  return (penData?.total_depositos || 0).toLocaleString('es-PE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  });
                })()}
              </p>
            </div>
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="text-amber-600 dark:text-amber-400" size={20} />
            </div>
          </div>
        </div>

        {/* Cantidad Total */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cantidad Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(() => {
                  if (reportes?.summary && Array.isArray(reportes.summary)) {
                    return reportes.summary.reduce((sum, s) => sum + (s.cantidad_depositos || 0), 0).toLocaleString();
                  }
                  return (reportes?.summary?.cantidad_depositos || 0).toLocaleString();
                })()}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <BarChart3 className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
          </div>
        </div>

        {/* Validados */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Validados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(() => {
                  if (reportes?.summary && Array.isArray(reportes.summary)) {
                    return reportes.summary.reduce((sum, s) => sum + (s.depositos_validados || 0), 0).toLocaleString();
                  }
                  return (reportes?.summary?.depositos_validados || 0).toLocaleString();
                })()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {percentageValidated}% del total
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Calendar className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* NUEVO: Gráfico de Confirmados vs Rechazados - UN SOLO GRÁFICO (por cantidad, no por moneda) */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              📈 Validados vs Rechazados
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cantidad de depósitos por estado
            </p>
          </div>
          {/* Filtro de período con diseño moderno */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setSelectedTrendPeriod('semana')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                selectedTrendPeriod === 'semana'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600'
              }`}
            >
              7 días
            </button>
            <button
              onClick={() => setSelectedTrendPeriod('mes')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                selectedTrendPeriod === 'mes'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600'
              }`}
            >
              30 días
            </button>
            <button
              onClick={() => setSelectedTrendPeriod('año')}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                selectedTrendPeriod === 'año'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-600'
              }`}
            >
              Año
            </button>
          </div>
        </div>

        {/* Stats rápidos - totales combinando USD y PEN */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Validados</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {(reportes?.confirmedRejectedUSD?.reduce((sum, item) => sum + (item.confirmados || 0), 0) || 0) +
                   (reportes?.confirmedRejectedPEN?.reduce((sum, item) => sum + (item.confirmados || 0), 0) || 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-800/50 rounded-full flex items-center justify-center">
                <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">Rechazados</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {(reportes?.confirmedRejectedUSD?.reduce((sum, item) => sum + (item.rechazados || 0), 0) || 0) +
                   (reportes?.confirmedRejectedPEN?.reduce((sum, item) => sum + (item.rechazados || 0), 0) || 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 dark:bg-red-800/50 rounded-full flex items-center justify-center">
                <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
            <div>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">Tasa Aprobación</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {(() => {
                  const totalConfirmados = (reportes?.confirmedRejectedUSD?.reduce((sum, item) => sum + (item.confirmados || 0), 0) || 0) +
                                          (reportes?.confirmedRejectedPEN?.reduce((sum, item) => sum + (item.confirmados || 0), 0) || 0);
                  const totalRechazados = (reportes?.confirmedRejectedUSD?.reduce((sum, item) => sum + (item.rechazados || 0), 0) || 0) +
                                         (reportes?.confirmedRejectedPEN?.reduce((sum, item) => sum + (item.rechazados || 0), 0) || 0);
                  const total = totalConfirmados + totalRechazados;
                  return total > 0 ? `${((totalConfirmados / total) * 100).toFixed(0)}%` : '0%';
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Gráfico de líneas - combinando USD y PEN */}
        <div className="bg-white dark:bg-gray-800/50 rounded-xl p-4">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={(() => {
                // Combinar USD y PEN sumando las cantidades por día
                const combined = {};
                (reportes?.confirmedRejectedUSD || []).forEach(item => {
                  if (!combined[item.dia]) combined[item.dia] = { dia: item.dia, confirmados: 0, rechazados: 0 };
                  combined[item.dia].confirmados += item.confirmados || 0;
                  combined[item.dia].rechazados += item.rechazados || 0;
                });
                (reportes?.confirmedRejectedPEN || []).forEach(item => {
                  if (!combined[item.dia]) combined[item.dia] = { dia: item.dia, confirmados: 0, rechazados: 0 };
                  combined[item.dia].confirmados += item.confirmados || 0;
                  combined[item.dia].rechazados += item.rechazados || 0;
                });
                return Object.values(combined);
              })()}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorConfirmados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRechazados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
              <XAxis dataKey="dia" stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: '500' }} tickLine={false} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px', fontWeight: '500' }} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  padding: '12px'
                }}
                itemStyle={{ color: '#1f2937', fontWeight: '600', fontSize: '13px' }}
                labelStyle={{ color: '#6b7280', fontWeight: '500', marginBottom: '4px' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
              <Line type="monotone" dataKey="confirmados" stroke="#10b981" strokeWidth={3} name="✓ Validados"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 5, stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                fill="url(#colorConfirmados)" />
              <Line type="monotone" dataKey="rechazados" stroke="#ef4444" strokeWidth={3} name="✗ Rechazados"
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 5, stroke: '#fff' }}
                activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                fill="url(#colorRechazados)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Depósitos por Sucursal */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Depósitos Confirmados por Sucursal
          </h3>
          <div className="space-y-4">
            {reportes?.bySucursal?.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.nombre}
                </div>

                {/* USD */}
                {item.usd.monto > 0 && (
                  <div className="space-y-1 pl-3 border-l-2 border-emerald-500">
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">💵 USD</span>
                      <span className="text-gray-900 dark:text-white font-semibold">
                        ${item.usd.monto?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="relative w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${item.usd.porcentaje}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{item.usd.cantidad} depósitos</span>
                      <span>{item.usd.porcentaje?.toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {/* PEN */}
                {item.pen.monto > 0 && (
                  <div className="space-y-1 pl-3 border-l-2 border-amber-500">
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-600 dark:text-amber-400 font-medium">💰 PEN</span>
                      <span className="text-gray-900 dark:text-white font-semibold">
                        S/{item.pen.monto?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="relative w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${item.pen.porcentaje}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{item.pen.cantidad} depósitos</span>
                      <span>{item.pen.porcentaje?.toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Depósitos por Banco */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Depósitos Confirmados por Banco
          </h3>
          <div className="space-y-4">
            {reportes?.byBanco?.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.nombre}
                </div>

                {/* USD */}
                {item.usd.monto > 0 && (
                  <div className="space-y-1 pl-3 border-l-2 border-emerald-500">
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">💵 USD</span>
                      <span className="text-gray-900 dark:text-white font-semibold">
                        ${item.usd.monto?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="relative w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${item.usd.porcentaje}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{item.usd.cantidad} depósitos</span>
                      <span>{item.usd.porcentaje?.toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {/* PEN */}
                {item.pen.monto > 0 && (
                  <div className="space-y-1 pl-3 border-l-2 border-amber-500">
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-600 dark:text-amber-400 font-medium">💰 PEN</span>
                      <span className="text-gray-900 dark:text-white font-semibold">
                        S/{item.pen.monto?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="relative w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${item.pen.porcentaje}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{item.pen.cantidad} depósitos</span>
                      <span>{item.pen.porcentaje?.toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NUEVO: Top Sucursales por Confirmaciones */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            🏆 Top Sucursales por Confirmaciones
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ranking de sucursales con más depósitos validados
          </p>
        </div>

        <div className="space-y-4">
          {reportes?.topSucursales?.map((sucursal, index) => {
            const totalMonto = sucursal.monto_confirmado_usd + sucursal.monto_confirmado_pen;
            const isTop3 = index < 3;
            const medals = ['🥇', '🥈', '🥉'];

            return (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800/50 rounded-xl p-4 border transition-all hover:shadow-lg ${
                  isTop3
                    ? 'border-yellow-300 dark:border-yellow-600 shadow-md'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      isTop3
                        ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <span className="text-lg font-bold">
                        {isTop3 ? medals[index] : `#${index + 1}`}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {sucursal.nombre}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {sucursal.confirmados} confirmados de {sucursal.total_depositos} total
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        sucursal.tasa_confirmacion >= 90
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : sucursal.tasa_confirmacion >= 70
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {sucursal.tasa_confirmacion?.toFixed(1)}% aprobación
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${sucursal.tasa_confirmacion}%` }}
                  />
                </div>

                {/* Montos por moneda */}
                <div className="grid grid-cols-2 gap-3">
                  {sucursal.monto_confirmado_usd > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">💵 Confirmado USD</p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                        ${sucursal.monto_confirmado_usd?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  {sucursal.monto_confirmado_pen > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">💰 Confirmado PEN</p>
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                        S/{sucursal.monto_confirmado_pen?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(!reportes?.topSucursales || reportes.topSucursales.length === 0) && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No hay datos de confirmaciones disponibles</p>
            </div>
          )}
        </div>
      </div>

      {/* NUEVO: Rechazados por Sucursal */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl mt-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            ⚠️ Rechazados por Sucursal
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sucursales con más depósitos rechazados
          </p>
        </div>

        <div className="space-y-4">
          {reportes?.rejectedBySucursal?.map((sucursal, index) => {
            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 transition-all hover:shadow-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30">
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {sucursal.nombre}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {sucursal.rechazados} rechazados de {sucursal.total_depositos} total
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        sucursal.tasa_rechazo >= 30
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : sucursal.tasa_rechazo >= 15
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {sucursal.tasa_rechazo?.toFixed(1)}% rechazo
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso de rechazo */}
                <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all"
                    style={{ width: `${sucursal.tasa_rechazo}%` }}
                  />
                </div>

                {/* Montos rechazados por moneda */}
                <div className="grid grid-cols-2 gap-3">
                  {sucursal.monto_rechazado_usd > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">💵 Rechazado USD</p>
                      <p className="text-lg font-bold text-red-700 dark:text-red-300">
                        ${sucursal.monto_rechazado_usd?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  {sucursal.monto_rechazado_pen > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">💰 Rechazado PEN</p>
                      <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                        S/{sucursal.monto_rechazado_pen?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(!reportes?.rejectedBySucursal || reportes.rejectedBySucursal.length === 0) && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No hay datos de rechazos disponibles</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ReportesView;
