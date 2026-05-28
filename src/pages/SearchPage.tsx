/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { Station, Schedule } from '../types';
import apiService from '../services/api';
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
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().split('T')[0]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError('載入車站資料失敗');
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
        throw new Error('請選擇不同的起訖站');
      }

      const data = await apiService.searchSchedules({
        departure_date: departureDate,
        start_station_id: startStationId,
        end_station_id: endStationId,
      });

      setSchedules(data);
      if (data.length === 0) {
        setError('無符合的班次');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜尋失敗');
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
      <div className="search-card">
        <h2>搜尋班次</h2>

        <form onSubmit={handleSearch} className="search-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start-station">出發站</label>
              <select
                id="start-station"
                value={startStationId}
                onChange={(e) => setStartStationId(Number(e.target.value))}
              >
                <option value="">選擇出發站</option>
                {stations.map((station) => (
                  <option key={station.station_id} value={station.station_id}>
                    {station.station_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="end-station">抵達站</label>
              <select
                id="end-station"
                value={endStationId}
                onChange={(e) => setEndStationId(Number(e.target.value))}
              >
                <option value="">選擇抵達站</option>
                {stations.map((station) => (
                  <option key={station.station_id} value={station.station_id}>
                    {station.station_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="departure-date">出發日期</label>
              <input
                id="departure-date"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? '搜尋中...' : '搜尋班次'}
          </button>

          <div className="quick-actions">
            <button
              type="button"
              onClick={() => setDepartureDate(getTomorrow())}
              className="btn-secondary"
            >
              明天
            </button>
          </div>
        </form>
      </div>

      {schedules.length > 0 && (
        <div className="schedules-list">
          <h3>搜尋結果 ({schedules.length} 班次)</h3>
          {schedules.map((schedule) => (
            <div key={schedule.schedule_id} className="schedule-card">
              <div className="schedule-info">
                <div className="route">
                  <span className="station-from">{getStationName(startStationId)}</span>
                  <span className="arrow">→</span>
                  <span className="station-to">{getStationName(endStationId)}</span>
                </div>
                <div className="details">
                  <p>
                    <strong>車次:</strong> {schedule.train_no}
                  </p>
                  <p>
                    <strong>日期:</strong> {schedule.departure_date}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  onSelectSchedule(schedule, {
                    startStationId,
                    endStationId,
                    departureDate,
                  })
                }
                className="btn-primary"
              >
                選擇班次
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
