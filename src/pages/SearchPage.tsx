/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { Station, Schedule, NonReservedAvailability, PeakSalesSummary } from '../types';
import apiService from '../services/api';
import { useI18n } from '../i18n';
import '../styles/SearchPage.css';

type QueryTab = 'timetable' | 'booking' | 'non-reserved' | 'peak-sales';

interface SearchPageProps {
  onSelectSchedule: (schedule: Schedule, selection: SearchSelection) => void;
}

export interface SearchSelection {
  startStationId: number;
  endStationId: number;
  departureDate: string;
}

const LEVEL_CLASS: Record<string, string> = { low: 'congestion-low', medium: 'congestion-medium', high: 'congestion-high', full: 'congestion-full' };

function Pagination({ current, total, count, onChange }: { current: number; total: number; count: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;

  const pages: (number | '...')[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }

  return (
    <div className="pagination">
      <button className="page-btn" onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1}>‹ 上一頁</button>
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`dots-${i}`} className="page-dots">…</span>
          : <button key={p} className={`page-btn${current === p ? ' active' : ''}`} onClick={() => onChange(p)}>{p}</button>
      )}
      <button className="page-btn" onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total}>下一頁 ›</button>
      <span className="page-info">第 {current} / {total} 頁，共 {count} 筆</span>
    </div>
  );
}

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

export function SearchPage({ onSelectSchedule }: SearchPageProps) {
  const [activeTab, setActiveTab] = useState<QueryTab>('timetable');
  const [stations, setStations] = useState<Station[]>([]);
  const [startStationId, setStartStationId] = useState<number>(0);
  const [endStationId, setEndStationId] = useState<number>(0);
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<'all' | 'express' | 'standard'>('all');
  const [filterTime, setFilterTime] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');
  const PAGE_SIZE = 8;
  const { t } = useI18n();

  // ── Non-reserved tab state ──────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const [nrDate, setNrDate] = useState(today);
  const [nrStationId, setNrStationId] = useState('');
  const [nrResults, setNrResults] = useState<NonReservedAvailability[] | null>(null);
  const [nrLoading, setNrLoading] = useState(false);
  const [nrError, setNrError] = useState<string | null>(null);
  const [nrPage, setNrPage] = useState(1);

  // ── Peak sales tab state ────────────────────────────────────────────────────
  const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [psStart, setPsStart] = useState(today);
  const [psEnd, setPsEnd] = useState(sevenDaysLater);
  const [psResults, setPsResults] = useState<PeakSalesSummary[] | null>(null);
  const [psLoading, setPsLoading] = useState(false);
  const [psError, setPsError] = useState<string | null>(null);
  const [psPage, setPsPage] = useState(1);

  const loadStations = async () => {
    try {
      const data = await apiService.getStations();
      setStations(data.sort((a, b) => a.sequence_no - b.sequence_no));
      // Set default stations (first and last)
      if (data.length >= 2) {
        setStartStationId(data[0].station_id);
        setEndStationId(data[data.length - 1].station_id);
      }
    } catch (err) {
      setError(t('loadStationsFailed'));
      console.error(err);
    }
  };

  // Load stations on mount
  useEffect(() => {
    loadStations();
  }, []);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!startStationId || !endStationId || startStationId === endStationId) {
        throw new Error(t('chooseDifferentStations'));
      }

      const data = await apiService.searchSchedules({
        departure_date: departureDate,
        start_station_id: startStationId,
        end_station_id: endStationId,
      });

      setSchedules(data);
      setCurrentPage(1);
      setFilterType('all');
      setFilterTime('all');
      if (data.length === 0) {
        setError(t('noSchedules'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('searchFailed'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNrSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!nrStationId) return;
    setNrError(null); setNrLoading(true);
    try { setNrResults(await apiService.getNonReservedAvailability(nrDate, Number(nrStationId))); setNrPage(1); }
    catch (err) { setNrError(err instanceof Error ? err.message : '查詢失敗'); }
    finally { setNrLoading(false); }
  };

  const handlePsSearch = async (e: FormEvent) => {
    e.preventDefault();
    setPsError(null); setPsLoading(true);
    try { setPsResults(await apiService.getPeakSales(psStart, psEnd)); setPsPage(1); }
    catch (err) { setPsError(err instanceof Error ? err.message : '查詢失敗'); }
    finally { setPsLoading(false); }
  };

  const getTomorrow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  const getStationName = (id: number) => {
    return stations.find((s) => s.station_id === id)?.station_name || '';
  };

  return (
    <div className="search-page">
      <section className="service-hero">
        <div>
          <p className="hero-kicker">{t('quickSearch')}</p>
          <h2>{t('bookTickets')}</h2>
          <p>{t('searchIntro')}</p>
        </div>
        <div className="train-line" aria-hidden="true">
          <span>{t('stationNangang')}</span>
          <span>{t('stationTaichung')}</span>
          <span>{t('stationZuoying')}</span>
        </div>
      </section>

      <div className="search-card">
        <div className="query-tabs" aria-label="查詢類型">
          {(['timetable', 'booking', 'non-reserved', 'peak-sales'] as QueryTab[]).map((tab, i) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {t(['tabTimetableFare', 'tabOnlineBooking', 'tabNonReserved', 'tabHolidaySales'][i])}
            </button>
          ))}
        </div>

        {/* ── 自由座等候時間 ── */}
        {activeTab === 'non-reserved' && (
          <div className="tab-panel">
            <div className="search-heading"><h3>{t('tabNonReserved')}</h3><p>{t('nonReservedDesc')}</p></div>
            <form onSubmit={handleNrSearch} className="search-form">
              <div className="form-row">
                <div className="form-group">
                  <label>{t('departureDate')}</label>
                  <input type="date" value={nrDate} min={today} onChange={e => setNrDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>{t('startStation')}</label>
                  <select value={nrStationId} onChange={e => setNrStationId(e.target.value)} required>
                    <option value="">{t('selectStation')}</option>
                    {stations.map(s => <option key={s.station_id} value={s.station_id}>{s.station_name}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn-primary" disabled={nrLoading}>{nrLoading ? t('searching') : t('searchSchedules')}</button>
              </div>
            </form>
            {nrError && <div className="error-message">{nrError}</div>}
            {nrResults !== null && (nrResults.length === 0 ? <p className="empty-state">{t('noSchedules')}</p> : (() => {
              const nrTotal = Math.ceil(nrResults.length / PAGE_SIZE);
              const nrPaged = nrResults.slice((nrPage - 1) * PAGE_SIZE, nrPage * PAGE_SIZE);
              return (<>
                <table className="data-table">
                  <thead><tr><th>{t('trainNo')}</th><th>{t('trainType')}</th><th>{t('departureTime')}</th><th>{t('nonReservedTotal')}</th><th>{t('occupied')}</th><th>{t('remaining')}</th><th>{t('congestionLevel')}</th></tr></thead>
                  <tbody>{nrPaged.map(r => (
                    <tr key={r.schedule_id}>
                      <td>{r.train_no}</td>
                      <td>{r.train_type === 'express' ? t('trainTypeExpress') : t('trainTypeLocal')}</td>
                      <td>{r.departure_time?.slice(0, 5) ?? '—'}</td>
                      <td>{r.non_reserved_total}</td>
                      <td>{r.non_reserved_sold}</td>
                      <td>{r.non_reserved_available}</td>
                      <td><span className={`congestion-badge ${LEVEL_CLASS[r.congestion_level]}`}>{t(`congestion${r.congestion_level.charAt(0).toUpperCase() + r.congestion_level.slice(1)}`)}</span></td>
                    </tr>
                  ))}</tbody>
                </table>
                <Pagination current={nrPage} total={nrTotal} count={nrResults.length} onChange={setNrPage} />
              </>);
            })())}
          </div>
        )}

        {/* ── 疏運期銷售資訊 ── */}
        {activeTab === 'peak-sales' && (
          <div className="tab-panel">
            <div className="search-heading"><h3>{t('tabHolidaySales')}</h3><p>{t('peakSalesDesc')}</p></div>
            <form onSubmit={handlePsSearch} className="search-form">
              <div className="form-row">
                <div className="form-group">
                  <label>{t('startDate')}</label>
                  <input type="date" value={psStart} min={today} onChange={e => setPsStart(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>{t('endDate')}</label>
                  <input type="date" value={psEnd} min={psStart} onChange={e => setPsEnd(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary" disabled={psLoading}>{psLoading ? t('searching') : t('searchSchedules')}</button>
              </div>
            </form>
            {psError && <div className="error-message">{psError}</div>}
            {psResults !== null && (psResults.length === 0 ? <p className="empty-state">{t('noSchedules')}</p> : (() => {
              const psTotal = Math.ceil(psResults.length / PAGE_SIZE);
              const psPaged = psResults.slice((psPage - 1) * PAGE_SIZE, psPage * PAGE_SIZE);
              return (<>
                <table className="data-table">
                  <thead><tr><th>{t('date')}</th><th>{t('trainNo')}</th><th>{t('trainType')}</th><th>{t('firstDeparture')}</th><th>{t('lastArrival')}</th><th>{t('totalSeats')}</th><th>{t('soldSeats')}</th><th>{t('remaining')}</th><th>{t('occupancyRate')}</th></tr></thead>
                  <tbody>{psPaged.map(r => (
                    <tr key={r.schedule_id}>
                      <td>{r.departure_date}</td>
                      <td>{r.train_no}</td>
                      <td>{r.train_type === 'express' ? t('trainTypeExpress') : t('trainTypeLocal')}</td>
                      <td>{r.first_departure_time?.slice(0, 5) ?? '—'}</td>
                      <td>{r.last_arrival_time?.slice(0, 5) ?? '—'}</td>
                      <td>{r.total_seats}</td>
                      <td>{r.sold_seats}</td>
                      <td>{r.available_seats}</td>
                      <td><OccupancyBar rate={r.occupancy_rate} /></td>
                    </tr>
                  ))}</tbody>
                </table>
                <Pagination current={psPage} total={psTotal} count={psResults.length} onChange={setPsPage} />
              </>);
            })())}
          </div>
        )}

        {/* ── 時刻表與票價 / 網路訂票 ── */}
        {(activeTab === 'timetable' || activeTab === 'booking') && <>
        <div className="search-heading">
          <h3>{t('trainSearch')}</h3>
          <p>{t('searchHint')}</p>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <div className="trip-type">
            <label>
              <input
                type="radio"
                name="trip-type"
                checked={tripType === 'one-way'}
                onChange={() => setTripType('one-way')}
              />
              {t('oneWay')}
            </label>
            <label>
              <input
                type="radio"
                name="trip-type"
                checked={tripType === 'round-trip'}
                onChange={() => setTripType('round-trip')}
              />
              {t('roundTrip')}
            </label>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start-station">{t('startStation')}</label>
              <select
                id="start-station"
                value={startStationId}
                onChange={(e) => setStartStationId(Number(e.target.value))}
              >
                <option value="">{t('selectStartStation')}</option>
                {stations.map((station) => (
                  <option key={station.station_id} value={station.station_id}>
                    {station.station_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="end-station">{t('endStation')}</label>
              <select
                id="end-station"
                value={endStationId}
                onChange={(e) => setEndStationId(Number(e.target.value))}
              >
                <option value="">{t('selectEndStation')}</option>
                {stations.map((station) => (
                  <option key={station.station_id} value={station.station_id}>
                    {station.station_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="departure-date">{t('departureDate')}</label>
              <div className="date-input-row">
                <input
                  id="departure-date"
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <button
                  type="button"
                  className="btn-date-shortcut"
                  onClick={() => setDepartureDate(getTomorrow())}
                >
                  {t('tomorrow')}
                </button>
              </div>
            </div>

            {tripType === 'round-trip' && (
              <div className="form-group">
                <label htmlFor="return-date">{t('returnDate')}</label>
                <input
                  id="return-date"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={departureDate}
                />
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('searching') : t('searchSchedules')}
          </button>
        </form>
        </>}
      </div>

      {(activeTab === 'timetable' || activeTab === 'booking') && schedules.length > 0 && (() => {
        const filtered = schedules.filter((s) => {
          if (filterType !== 'all' && s.train_type !== filterType) return false;
          const h = parseInt(s.origin_departure_time?.slice(0, 2) ?? '12');
          if (filterTime === 'morning' && h >= 12) return false;
          if (filterTime === 'afternoon' && (h < 12 || h >= 18)) return false;
          if (filterTime === 'evening' && h < 18) return false;
          return true;
        });
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
        const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
        return (
          <div className="schedules-list">
            <div className="result-title">
              <h3>{t('resultTitle')}</h3>
              <span>{t('trainsCount', { count: filtered.length })}</span>
            </div>

            {/* ── Filters ── */}
            <div className="schedule-filters">
              <div className="filter-group">
                <span className="filter-label">{t('trainType')}</span>
                {(['all', 'express', 'standard'] as const).map((v) => (
                  <button key={v} type="button"
                    className={`filter-chip${filterType === v ? ' active' : ''}`}
                    onClick={() => { setFilterType(v); setCurrentPage(1); }}>
                    {v === 'all' ? t('filterAll') : v === 'express' ? t('trainExpress') : t('trainLocal')}
                  </button>
                ))}
              </div>
              <div className="filter-group">
                <span className="filter-label">{t('timePeriod')}</span>
                {(['all', 'morning', 'afternoon', 'evening'] as const).map((v) => (
                  <button key={v} type="button"
                    className={`filter-chip${filterTime === v ? ' active' : ''}`}
                    onClick={() => { setFilterTime(v); setCurrentPage(1); }}>
                    {v === 'all' ? t('filterAll') : v === 'morning' ? t('timeMorning') : v === 'afternoon' ? t('timeAfternoon') : t('timeEvening')}
                  </button>
                ))}
              </div>
            </div>

            {paginated.map((schedule) => (
              <div key={schedule.schedule_id} className="schedule-card">
                <div className="schedule-info">
                  <div className="route">
                    <span className="station-from">{getStationName(startStationId)}</span>
                    <span className="arrow">→</span>
                    <span className="station-to">{getStationName(endStationId)}</span>
                  </div>
                  <div className="details">
                    <p><strong>{t('trainNo')}:</strong> {schedule.train_no}
                      <span className="train-type-badge">{schedule.train_type === 'express' ? t('trainExpress') : t('trainLocal')}</span>
                    </p>
                    <p><strong>{t('departureTime')}:</strong> {schedule.origin_departure_time?.slice(0, 5) || '--:--'}</p>
                    <p><strong>{t('arrivalTime')}:</strong> {schedule.destination_arrival_time?.slice(0, 5) || '--:--'}</p>
                    <p><strong>{t('date')}:</strong> {schedule.departure_date}</p>
                    {schedule.available_seats !== null && schedule.available_seats !== undefined && (
                      <p className={`seats-badge ${schedule.available_seats === 0 ? 'no-seats' : schedule.available_seats <= 20 ? 'few-seats' : 'many-seats'}`}>
                        {schedule.available_seats === 0 ? t('noSeatsLeft') : t('seatsRemaining', { count: schedule.available_seats })}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onSelectSchedule(schedule, { startStationId, endStationId, departureDate })}
                  className="btn-primary"
                >
                  {t('selectSchedule')}
                </button>
              </div>
            ))}

            <Pagination current={currentPage} total={totalPages} count={schedules.length} onChange={setCurrentPage} />
          </div>
        );
      })()}
    </div>
  );
}
