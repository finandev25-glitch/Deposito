import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  Search,
  Filter,
  Download,
  Building2,
  Users,
  Phone,
  Briefcase,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { apiGet } from '../services/backendApi.js';

const SucursalesTableView = ({ sucursales }) => {
  const [allPersonal, setAllPersonal] = useState([]);
  const [filteredPersonal, setFilteredPersonal] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSucursal, setFilterSucursal] = useState('all');
  const [filterEstado, setFilterEstado] = useState('activo');
  const [loading, setLoading] = useState(true);

  // Cargar todos los trabajadores
  useEffect(() => {
    const fetchAllPersonal = async () => {
      try {
        setLoading(true);
        const response = await apiGet('/dashboard/bootstrap');
        const sucursalMap = new Map(
          (response.sucursales || []).map((sucursal) => [String(sucursal.id), sucursal])
        );
        const personal = (response.personal || []).map((person) => ({
          ...person,
          sucursales: sucursalMap.get(String(person.sucursal_id)) || null,
        }));
        setAllPersonal(personal);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllPersonal();
  }, [sucursales]);

  // Filtrar trabajadores
  useEffect(() => {
    let filtered = allPersonal;

    // Filtrar por búsqueda
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(person =>
        (person.nombre && person.nombre.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (person.telefono_origen && person.telefono_origen.includes(lowerCaseSearchTerm)) ||
        (person.empresa && person.empresa.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (person.sucursales?.nombre && person.sucursales.nombre.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    // Filtrar por sucursal
    if (filterSucursal !== 'all') {
      filtered = filtered.filter(person => person.sucursal_id === filterSucursal);
    }

    // Filtrar por estado
    if (filterEstado !== 'all') {
      filtered = filtered.filter(person => person.estado === filterEstado);
    }

    setFilteredPersonal(filtered);
  }, [allPersonal, searchTerm, filterSucursal, filterEstado]);

  const handleExportExcel = () => {
    const dataToExport = filteredPersonal.map(person => ({
      'Sucursal': person.sucursales?.nombre || '-',
      'Nombre Trabajador': person.nombre,
      'Teléfono': person.telefono_origen,
      'Empresa': person.empresa || '-',
      'Estado': person.estado === 'activo' ? 'Activo' : 'Inactivo',
      'Tipo Registro': person.tipo_registro || '-',
      'Fecha Registro': new Date(person.created_at).toLocaleString('es-ES')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Personal");
    XLSX.writeFile(workbook, "listado_personal_sucursales.xlsx");
  };

  const getEstadoBadge = (estado) => {
    if (estado === 'activo') {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
          <CheckCircle size={12} />
          <span>Activo</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
          <XCircle size={12} />
          <span>Inactivo</span>
        </span>
      );
    }
  };

  return (
    <>
      <div className="h-full p-6 flex flex-col">
        <div className="flex flex-col space-y-4 mb-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Listado de Personal</h2>
              <p className="text-gray-600 dark:text-gray-400">Todos los trabajadores de todas las sucursales.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportExcel}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Download size={14} />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono, empresa o sucursal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter size={14} className="text-gray-400" />
              <select
                value={filterSucursal}
                onChange={(e) => setFilterSucursal(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
              >
                <option value="all">Todas las sucursales</option>
                {sucursales
                  .filter(s => s.estado === 'activa')
                  .map(sucursal => (
                    <option key={sucursal.id} value={sucursal.id}>
                      {sucursal.nombre}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Filter size={14} className="text-gray-400" />
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200"
              >
                <option value="all">Todos los estados</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <Building2 size={12} />
                      <span>Sucursal</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <Users size={12} />
                      <span>Nombre Trabajador</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <Phone size={12} />
                      <span>Teléfono</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <Briefcase size={12} />
                      <span>Empresa</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo Registro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha Registro</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-16 text-gray-500 dark:text-gray-400">
                      <p>Cargando...</p>
                    </td>
                  </tr>
                ) : filteredPersonal.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-16 text-gray-500 dark:text-gray-400">
                      <p>No se encontraron trabajadores.</p>
                    </td>
                  </tr>
                ) : (
                  filteredPersonal.map((person) => (
                    <tr
                      key={person.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {person.sucursales?.nombre || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {person.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {person.telefono_origen}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {person.empresa || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getEstadoBadge(person.estado)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {person.tipo_registro || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(person.created_at).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredPersonal.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Mostrando {filteredPersonal.length} trabajador{filteredPersonal.length !== 1 ? 'es' : ''} de {allPersonal.length} total{allPersonal.length !== 1 ? 'es' : ''}
          </div>
        )}
      </div>
    </>
  );
};

export default SucursalesTableView;
