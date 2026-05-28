import { useState } from 'react';
import type { Station, NonReservedAvailability } from '../types';
import { useI18n } from '../i18n';
import apiService from '../services/api';

interface Props {
  stations: Station[];
}

const LEVEL_LABEL: Record<string, string> = {
  low: '順暢',
  medium: '稍擁擠',
  high: '擁擠',
  full: '滿載',
};

const LEVEL_CLASS: Record<string, string> = {
  low: 'congestion-low',
  medium: 'congestion-medium',
  high: 'congestion-high',
  full: 'congestion-full',
};

export function NonReservedPage({ stations }: Props) {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [stationId, setStationId] = useState('');
  const [results, setResults] = useState<NonReservedAvailability[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationId) return;
    setError(null);
    setLoading(true);
    try {
      const data = await apiService.getNonReservedAvailability(date, Number(stationId));
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查詢失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <h2>{t('tabNonReserved')}</h2>
      <p className="page-hint">選擇日期與出發站，查詢各班次自由座剩餘情形。</p>

      <form className="search-form" onSubmit={handleSearch}>
        <div className="form-row">
          <div className="form-group">
            <label>{t('departureDate')}</label>
            <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>{t('startStation')}</label>
            <select value={stationId} onChange={e => setStationId(e.target.value)} required>
              <option value="">請選擇車站</option>
              {stations.map(s => (
                <option key={s.station_id} value={s.station_id}>{s.station_name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t('searching') : t('searchSchedules')}
          </button>
        </div>
      </form>

      {error && <div className="error-message">{error}</div>}

      {results !== null && (
        results.length === 0 ? (
          <p className="empty-state">{t('noSchedules')}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('trainNo')}</th>
                <th>車種</th>
                <th>{t('departureTime')}</th>
                <th>自由座總數</th>
                <th>已售出</th>
                <th>剩餘</th>
                <th>壅擠程度</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.schedule_id}>
                  <td>{r.train_no}</td>
                  <td>{r.train_type === 'express' ? '自強' : '莒光'}</td>
                  <td>{r.departure_time?.slice(0, 5) ?? '—'}</td>
                  <td>{r.non_reserved_total}</td>
                  <td>{r.non_reserved_sold}</td>
                  <td>{r.non_reserved_available}</td>
                  <td>
                    <span className={`congestion-badge ${LEVEL_CLASS[r.congestion_level]}`}>
                      {LEVEL_LABEL[r.congestion_level] ?? r.congestion_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
