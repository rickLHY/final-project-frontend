/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import type { Waitlist, Station } from '../types';
import apiService from '../services/api';
import { useI18n } from '../i18n';
import '../styles/Waitlist.css';

interface WaitlistPageProps {
  stations: Station[];
}

export function WaitlistPage({ stations }: WaitlistPageProps) {
  const [waitlists, setWaitlists] = useState<Waitlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { locale, t } = useI18n();

  const loadWaitlists = async () => {
    try {
      const data = await apiService.getMyWaitlists();
      setWaitlists(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadWaitlistFailed'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWaitlists();
  }, []);

  const handleCancel = async (waitlistId: number) => {
    if (!window.confirm(t('confirmCancelWaitlist'))) return;

    try {
      await apiService.cancelWaitlist(waitlistId);
      setWaitlists(waitlists.filter((w) => w.waitlist_id !== waitlistId));
    } catch (err) {
      alert(err instanceof Error ? err.message : t('cancelWaitlistFailed'));
    }
  };

  const getStationName = (id: number) => {
    return stations.find((s) => s.station_id === id)?.station_name || `車站 ${id}`;
  };

  const getStatusLabel = (status: string) => {
    return t(status) || status;
  };

  const getSeatTypeLabel = (type: string) => {
    return t(type) || type;
  };

  if (loading) {
    return <div className="loading">{t('loading')}</div>;
  }

  if (waitlists.length === 0) {
    return (
      <div className="waitlist-page">
        <h2>{t('waitlist')}</h2>
        <div className="empty-state">
          <p>{t('emptyWaitlist')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="waitlist-page">
      <h2>{t('waitlist')}</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="waitlist-items">
        {waitlists.map((waitlist) => (
          <div key={waitlist.waitlist_id} className="waitlist-card">
            <div className="waitlist-info">
              <div className="route">
                <span className="station">{getStationName(waitlist.start_station_id)}</span>
                <span className="arrow">→</span>
                <span className="station">{getStationName(waitlist.end_station_id)}</span>
              </div>
              <div className="details">
                <p>
                  <strong>{t('status')}:</strong>
                  <span className={`status-badge ${waitlist.status}`}>
                    {getStatusLabel(waitlist.status)}
                  </span>
                </p>
                <p>
                  <strong>{t('preferredSeat')}:</strong> {getSeatTypeLabel(waitlist.preferred_seat_type)}
                </p>
                <p>
                  <strong>{t('createdAt')}:</strong> {new Date(waitlist.created_at).toLocaleString(locale)}
                </p>
              </div>
            </div>
            {waitlist.status === 'waiting' && (
              <button
                onClick={() => handleCancel(waitlist.waitlist_id)}
                className="btn-cancel"
              >
                {t('cancelWaitlist')}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
