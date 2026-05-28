/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import type { Waitlist, Station } from '../types';
import apiService from '../services/api';
import '../styles/Waitlist.css';

interface WaitlistPageProps {
  stations: Station[];
}

export function WaitlistPage({ stations }: WaitlistPageProps) {
  const [waitlists, setWaitlists] = useState<Waitlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWaitlists = async () => {
    try {
      const data = await apiService.getMyWaitlists();
      setWaitlists(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入候補清單失敗');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWaitlists();
  }, []);

  const handleCancel = async (waitlistId: number) => {
    if (!window.confirm('確認取消候補？')) return;

    try {
      await apiService.cancelWaitlist(waitlistId);
      setWaitlists(waitlists.filter((w) => w.waitlist_id !== waitlistId));
    } catch (err) {
      alert(err instanceof Error ? err.message : '取消候補失敗');
    }
  };

  const getStationName = (id: number) => {
    return stations.find((s) => s.station_id === id)?.station_name || `車站 ${id}`;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      waiting: '候補中',
      matched: '已媒合',
      expired: '已過期',
      cancelled: '已取消',
    };
    return labels[status] || status;
  };

  const getSeatTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      standard: '標準車廂',
      business: '商務車廂',
      any: '不限',
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="loading">載入中...</div>;
  }

  if (waitlists.length === 0) {
    return (
      <div className="waitlist-page">
        <h2>候補清單</h2>
        <div className="empty-state">
          <p>尚無候補資料</p>
        </div>
      </div>
    );
  }

  return (
    <div className="waitlist-page">
      <h2>候補清單</h2>

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
                  <strong>狀態:</strong>
                  <span className={`status-badge ${waitlist.status}`}>
                    {getStatusLabel(waitlist.status)}
                  </span>
                </p>
                <p>
                  <strong>偏好車廂:</strong> {getSeatTypeLabel(waitlist.preferred_seat_type)}
                </p>
                <p>
                  <strong>登記時間:</strong> {new Date(waitlist.created_at).toLocaleString('zh-TW')}
                </p>
              </div>
            </div>
            {waitlist.status === 'waiting' && (
              <button
                onClick={() => handleCancel(waitlist.waitlist_id)}
                className="btn-cancel"
              >
                取消候補
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
