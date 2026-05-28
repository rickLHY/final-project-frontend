/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { Station, Schedule } from '../types';
import apiService from '../services/api';
import { useI18n } from '../i18n';
import '../styles/SearchPage.css';

interface SearchPageProps {
  onSelectSchedule: (schedule: Schedule, selection: SearchSelection) => void;
}

export interface SearchSelection {
  startStationId: number;
  endStationId: number;
  departureDate: string;
}

export function SearchPage({ onSelectSchedule }: SearchPageProps) {
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
          <button type="button" className="active">{t('tabTimetableFare')}</button>
          <button type="button">{t('tabOnlineBooking')}</button>
          <button type="button">{t('tabNonReserved')}</button>
          <button type="button">{t('tabHolidaySales')}</button>
        </div>

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
      </div>

      {schedules.length > 0 && (() => {
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
                <span className="filter-label">車種</span>
                {(['all', 'express', 'standard'] as const).map((v) => (
                  <button key={v} type="button"
                    className={`filter-chip${filterType === v ? ' active' : ''}`}
                    onClick={() => { setFilterType(v); setCurrentPage(1); }}>
                    {v === 'all' ? '全部' : v === 'express' ? '直達' : '站站停'}
                  </button>
                ))}
              </div>
              <div className="filter-group">
                <span className="filter-label">時段</span>
                {(['all', 'morning', 'afternoon', 'evening'] as const).map((v) => (
                  <button key={v} type="button"
                    className={`filter-chip${filterTime === v ? ' active' : ''}`}
                    onClick={() => { setFilterTime(v); setCurrentPage(1); }}>
                    {v === 'all' ? '全部' : v === 'morning' ? '早（~12時）' : v === 'afternoon' ? '午（12-18時）' : '晚（18時~）'}
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
                      <span className="train-type-badge">{schedule.train_type === 'express' ? '直達' : '站站停'}</span>
                    </p>
                    <p><strong>{t('departureTime')}:</strong> {schedule.origin_departure_time?.slice(0, 5) || '--:--'}</p>
                    <p><strong>{t('arrivalTime')}:</strong> {schedule.destination_arrival_time?.slice(0, 5) || '--:--'}</p>
                    <p><strong>{t('date')}:</strong> {schedule.departure_date}</p>
                    {schedule.available_seats !== null && schedule.available_seats !== undefined && (
                      <p className={`seats-badge ${schedule.available_seats === 0 ? 'no-seats' : schedule.available_seats <= 20 ? 'few-seats' : 'many-seats'}`}>
                        {schedule.available_seats === 0 ? '✗ 已售完' : `● 剩餘 ${schedule.available_seats} 席`}
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

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ‹ 上一頁
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`page-btn${currentPage === page ? ' active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}

                <button
                  className="page-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  下一頁 ›
                </button>

                <span className="page-info">
                  第 {currentPage} / {totalPages} 頁，共 {schedules.length} 班
                </span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
