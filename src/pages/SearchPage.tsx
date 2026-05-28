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
      <section className="service-hero">
        <div>
          <p className="hero-kicker">快速查詢</p>
          <h2>預訂高鐵車票</h2>
          <p>查詢班次、確認票價並進入線上訂位流程。</p>
        </div>
        <div className="train-line" aria-hidden="true">
          <span>南港</span>
          <span>台中</span>
          <span>左營</span>
        </div>
      </section>

      <div className="search-card">
        <div className="query-tabs" aria-label="查詢類型">
          <button type="button" className="active">時刻表與票價</button>
          <button type="button">網路訂票</button>
          <button type="button">自由座等候時間</button>
          <button type="button">疏運期銷售資訊</button>
        </div>

        <div className="search-heading">
          <h3>車次查詢</h3>
          <p>請選擇出發站、抵達站與乘車日期。</p>
        </div>

        <form onSubmit={handleSearch} className="search-form">
          <div className="trip-type">
            <label>
              <input type="radio" checked readOnly />
              單程
            </label>
            <label>
              <input type="radio" disabled />
              去回程
            </label>
          </div>

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
          <div className="result-title">
            <h3>搜尋結果</h3>
            <span>{schedules.length} 班次</span>
          </div>
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
                    <strong>發車:</strong> {schedule.origin_departure_time?.slice(0, 5) || '--:--'}
                  </p>
                  <p>
                    <strong>抵達:</strong> {schedule.destination_arrival_time?.slice(0, 5) || '--:--'}
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
