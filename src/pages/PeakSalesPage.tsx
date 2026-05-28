import { useState } from 'react';
import type { PeakSalesSummary } from '../types';
import { useI18n } from '../i18n';
import apiService from '../services/api';

const today = new Date().toISOString().slice(0, 10);
const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

function OccupancyBar({ rate }: { rate: number }) {
  const color = rate >= 90 ? '#e53935' : rate >= 60 ? '#fb8c00' : '#43a047';
  return (
    <div className="occupancy-bar-wrap">
      <div className="occupancy-bar-bg">
        <div className="occupancy-bar-fill" style={{ width: `${Math.min(rate, 100)}%`, background: color }} />
      </div>
      <span className="occupancy-label">{rate.toFixed(1)}%</span>
    </div>
  );
}

export function PeakSalesPage() {
  const { t } = useI18n();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(sevenDaysLater);
  const [results, setResults] = useState<PeakSalesSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiService.getPeakSales(startDate, endDate);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查詢失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <h2>{t('tabHolidaySales')}</h2>
      <p className="page-hint">選擇日期區間，查詢各班次票務銷售狀況。</p>

      <form className="search-form" onSubmit={handleSearch}>
        <div className="form-row">
          <div className="form-group">
            <label>開始日期</label>
            <input type="date" value={startDate} min={today} onChange={e => setStartDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>結束日期</label>
            <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required />
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
                <th>{t('date')}</th>
                <th>{t('trainNo')}</th>
                <th>車種</th>
                <th>首班發車</th>
                <th>末班到達</th>
                <th>總座位</th>
                <th>已售</th>
                <th>剩餘</th>
                <th>售票率</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.schedule_id}>
                  <td>{r.departure_date}</td>
                  <td>{r.train_no}</td>
                  <td>{r.train_type === 'express' ? '自強' : '莒光'}</td>
                  <td>{r.first_departure_time?.slice(0, 5) ?? '—'}</td>
                  <td>{r.last_arrival_time?.slice(0, 5) ?? '—'}</td>
                  <td>{r.total_seats}</td>
                  <td>{r.sold_seats}</td>
                  <td>{r.available_seats}</td>
                  <td><OccupancyBar rate={r.occupancy_rate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}
