import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { useAuth } from './contexts/AuthContext'
import api from './services/api'
import type {
  AvailableSeat,
  EarlyBirdPool,
  Order,
  Schedule,
  ScheduleDetail,
  Station,
  TicketPrice,
  TicketType,
  Waitlist,
} from './types'

const today = new Date().toISOString().slice(0, 10)

const ticketTypeLabels: Record<TicketType, string> = {
  full: '全票',
  'early-bird': '早鳥',
  student: '大學生',
  elderly: '敬老',
  companion: '愛心',
  friend: '愛陪',
  child: '兒童',
}

const ticketDiscounts: Record<TicketType, number> = {
  full: 1,
  'early-bird': 0.65,
  student: 0.75,
  elderly: 0.5,
  companion: 0.5,
  friend: 0.5,
  child: 0.5,
}

function App() {
  const { user, loading, login, register, logout } = useAuth()
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({
    email: 'user@thsr.com',
    password: 'user1234',
    name: '',
    phone: '',
  })
  const [authError, setAuthError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const [stations, setStations] = useState<Station[]>([])
  const [search, setSearch] = useState({
    departure_date: today,
    start_station_id: 2,
    end_station_id: 12,
  })
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [scheduleDetail, setScheduleDetail] = useState<ScheduleDetail | null>(null)
  const [earlyBird, setEarlyBird] = useState<EarlyBirdPool[]>([])
  const [prices, setPrices] = useState<TicketPrice[]>([])
  const [seats, setSeats] = useState<AvailableSeat[]>([])
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([])
  const [ticketType, setTicketType] = useState<TicketType>('full')
  const [businessOnly, setBusinessOnly] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [bookingCode, setBookingCode] = useState('')
  const [lookedUpOrder, setLookedUpOrder] = useState<Order | null>(null)
  const [waitlists, setWaitlists] = useState<Waitlist[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const stationById = useMemo(() => {
    return new Map(stations.map((station) => [station.station_id, station]))
  }, [stations])

  const selectedSeats = useMemo(() => {
    return selectedSeatIds
      .map((seatId) => seats.find((seat) => seat.seat_id === seatId))
      .filter((seat): seat is AvailableSeat => Boolean(seat))
  }, [seats, selectedSeatIds])

  const basePrice = useMemo(() => {
    const matching = prices.find((price) => price.is_business === businessOnly)
    return matching?.base_price ?? prices[0]?.base_price ?? 0
  }, [businessOnly, prices])

  const estimatedTotal = Math.round(basePrice * ticketDiscounts[ticketType] * selectedSeatIds.length)

  useEffect(() => {
    api
      .getStations()
      .then((items) => {
        const sorted = [...items].sort((a, b) => a.sequence_no - b.sequence_no)
        setStations(sorted)
        if (sorted.length >= 2) {
          setSearch((current) => ({
            ...current,
            start_station_id: current.start_station_id || sorted[0].station_id,
            end_station_id: current.end_station_id || sorted[sorted.length - 1].station_id,
          }))
        }
      })
      .catch((err) => setError(readError(err)))
  }, [])

  useEffect(() => {
    if (!user) return
    void refreshOrders()
    void refreshWaitlists()
  }, [user])

  useEffect(() => {
    if (!search.start_station_id || !search.end_station_id) return
    api
      .getTicketPrices(search.start_station_id, search.end_station_id)
      .then(setPrices)
      .catch(() => setPrices([]))
  }, [search.start_station_id, search.end_station_id])

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    try {
      if (authMode === 'login') {
        await login(authForm.email, authForm.password)
      } else {
        await register(authForm.email, authForm.password, authForm.name, authForm.phone)
      }
    } catch (err) {
      setAuthError(readError(err))
    } finally {
      setAuthBusy(false)
    }
  }

  async function searchSchedules(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    setSelectedSchedule(null)
    setScheduleDetail(null)
    setSeats([])
    setSelectedSeatIds([])
    try {
      const results = await api.searchSchedules(search)
      setSchedules(results)
      setMessage(results.length ? `找到 ${results.length} 班車` : '這個日期與區間目前沒有班次')
    } catch (err) {
      setError(readError(err))
    } finally {
      setBusy(false)
    }
  }

  async function chooseSchedule(schedule: Schedule) {
    setSelectedSchedule(schedule)
    setBusy(true)
    setError('')
    setSelectedSeatIds([])
    try {
      const [detail, seatList, poolList] = await Promise.all([
        api.getScheduleDetail(schedule.schedule_id),
        api.getAvailableSeats(
          schedule.schedule_id,
          search.start_station_id,
          search.end_station_id,
          businessOnly,
        ),
        api.getEarlyBirdPools(schedule.schedule_id),
      ])
      setScheduleDetail(detail)
      setSeats(seatList)
      setEarlyBird(detail.early_bird_pools?.length ? detail.early_bird_pools : poolList)
    } catch (err) {
      setError(readError(err))
    } finally {
      setBusy(false)
    }
  }

  async function createOrder() {
    if (!user) {
      setError('請先登入再訂票')
      return
    }
    if (!selectedSchedule || selectedSeatIds.length === 0) {
      setError('請先選擇班次與座位')
      return
    }
    setBusy(true)
    setError('')
    try {
      const order = await api.createOrder({
        schedule_id: selectedSchedule.schedule_id,
        tickets: selectedSeatIds.map((seatId) => ({
          seat_id: seatId,
          start_station_id: search.start_station_id,
          end_station_id: search.end_station_id,
          ticket_type: ticketType,
        })),
      })
      setMessage(`訂位成功，訂位代號 ${order.booking_code}`)
      setSelectedSeatIds([])
      setOrders((current) => [order, ...current])
      await chooseSchedule(selectedSchedule)
      await refreshOrders()
    } catch (err) {
      setError(readError(err))
    } finally {
      setBusy(false)
    }
  }

  async function joinWaitlist() {
    if (!user || !selectedSchedule) return
    setBusy(true)
    setError('')
    try {
      const item = await api.createWaitlist({
        user_id: user.user_id,
        schedule_id: selectedSchedule.schedule_id,
        start_station_id: search.start_station_id,
        end_station_id: search.end_station_id,
        preferred_seat_type: businessOnly ? 'business' : 'any',
        status: 'waiting',
      })
      setWaitlists((current) => [item, ...current])
      setMessage('已加入候補清單')
    } catch (err) {
      setError(readError(err))
    } finally {
      setBusy(false)
    }
  }

  async function updateOrder(orderId: number, action: 'pay' | 'cancel') {
    setBusy(true)
    setError('')
    try {
      await (action === 'pay' ? api.payOrder(orderId) : api.cancelOrder(orderId))
      await refreshOrders()
      setMessage(action === 'pay' ? '付款狀態已更新' : '訂單已取消')
    } catch (err) {
      setError(readError(err))
    } finally {
      setBusy(false)
    }
  }

  async function lookupOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!bookingCode.trim()) return
    setBusy(true)
    setError('')
    try {
      setLookedUpOrder(await api.getOrderByBookingCode(bookingCode.trim()))
    } catch (err) {
      setLookedUpOrder(null)
      setError(readError(err))
    } finally {
      setBusy(false)
    }
  }

  async function refreshOrders() {
    try {
      setOrders(await api.getMyOrders())
    } catch {
      setOrders([])
    }
  }

  async function refreshWaitlists() {
    try {
      setWaitlists(await api.getMyWaitlists())
    } catch {
      setWaitlists([])
    }
  }

  function toggleSeat(seatId: number) {
    setSelectedSeatIds((current) => {
      if (current.includes(seatId)) return current.filter((id) => id !== seatId)
      if (current.length >= 6) {
        setError('一次最多選 6 張票')
        return current
      }
      setError('')
      return [...current, seatId]
    })
  }

  const startStation = stationById.get(search.start_station_id)
  const endStation = stationById.get(search.end_station_id)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Database Final Project</p>
          <h1>台灣高鐵訂票系統</h1>
        </div>
        <div className="account-box">
          {loading ? (
            <span>載入會員...</span>
          ) : user ? (
            <>
              <span>{user.name} / TGo {user.tgo_balance}</span>
              <button type="button" className="ghost-button" onClick={logout}>
                登出
              </button>
            </>
          ) : (
            <span>訪客模式</span>
          )}
        </div>
      </header>

      <section className="hero-band">
        <div>
          <p className="eyebrow">API: courier-relive-rival.ngrok-free.dev</p>
          <h2>{startStation?.station_name ?? '起站'} 到 {endStation?.station_name ?? '迄站'}</h2>
          <p>查詢班次、選位、建立訂單、付款、候補與訂位代號查詢都已串接後端。</p>
        </div>
      </section>

      <section className="workspace">
        <aside className="panel auth-panel">
          <div className="panel-heading">
            <h2>會員</h2>
            <div className="segmented">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                登入
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => setAuthMode('register')}
              >
                註冊
              </button>
            </div>
          </div>
          <form className="stack" onSubmit={handleAuth}>
            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                required
              />
            </label>
            <label>
              密碼
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                required
              />
            </label>
            {authMode === 'register' && (
              <>
                <label>
                  姓名
                  <input
                    value={authForm.name}
                    onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })}
                    required
                  />
                </label>
                <label>
                  電話
                  <input
                    value={authForm.phone}
                    onChange={(event) => setAuthForm({ ...authForm, phone: event.target.value })}
                    required
                  />
                </label>
              </>
            )}
            <button type="submit" className="primary-button" disabled={authBusy}>
              {authBusy ? '處理中...' : authMode === 'login' ? '登入' : '建立帳號'}
            </button>
            {authError && <p className="inline-error">{authError}</p>}
          </form>
        </aside>

        <section className="main-column">
          <form className="panel search-panel" onSubmit={searchSchedules}>
            <div className="field-grid">
              <label>
                日期
                <input
                  type="date"
                  value={search.departure_date}
                  onChange={(event) => setSearch({ ...search, departure_date: event.target.value })}
                  required
                />
              </label>
              <label>
                起站
                <select
                  value={search.start_station_id}
                  onChange={(event) => setSearch({ ...search, start_station_id: Number(event.target.value) })}
                >
                  {stations.map((station) => (
                    <option key={station.station_id} value={station.station_id}>
                      {station.station_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                迄站
                <select
                  value={search.end_station_id}
                  onChange={(event) => setSearch({ ...search, end_station_id: Number(event.target.value) })}
                >
                  {stations.map((station) => (
                    <option key={station.station_id} value={station.station_id}>
                      {station.station_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={businessOnly}
                  onChange={(event) => setBusinessOnly(event.target.checked)}
                />
                商務車廂
              </label>
              <button type="submit" className="primary-button" disabled={busy}>
                查詢班次
              </button>
            </div>
          </form>

          {(message || error) && (
            <div className={`notice ${error ? 'error' : ''}`}>
              {error || message}
            </div>
          )}

          <section className="content-grid">
            <div className="panel">
              <div className="panel-heading">
                <h2>班次</h2>
                <span>{schedules.length} 筆</span>
              </div>
              <div className="schedule-list">
                {schedules.map((schedule) => (
                  <button
                    type="button"
                    key={schedule.schedule_id}
                    className={`schedule-row ${selectedSchedule?.schedule_id === schedule.schedule_id ? 'selected' : ''}`}
                    onClick={() => chooseSchedule(schedule)}
                  >
                    <strong>{schedule.train_no}</strong>
                    <span>{schedule.train_type ?? '列車'}</span>
                    <span>{formatTime(schedule.origin_departure_time)} - {formatTime(schedule.destination_arrival_time)}</span>
                    <small>自由座第 {schedule.non_reserved_start_carriage} 車起</small>
                  </button>
                ))}
                {!schedules.length && <p className="muted">先查詢日期與區間。</p>}
              </div>
            </div>

            <div className="panel">
              <div className="panel-heading">
                <h2>停靠與優惠</h2>
                <span>{scheduleDetail?.stop_times.length ?? 0} 站</span>
              </div>
              <div className="stops">
                {scheduleDetail?.stop_times.map((stop) => (
                  <div key={stop.stop_id} className="stop-row">
                    <strong>{stop.station?.station_name ?? stationById.get(stop.station_id)?.station_name ?? stop.station_id}</strong>
                    <span>{formatTime(stop.arrival_time)} / {formatTime(stop.departure_time)}</span>
                  </div>
                ))}
              </div>
              <div className="discounts">
                {earlyBird.map((pool) => (
                  <span key={pool.pool_id}>
                    {Number(pool.discount_rate) * 100}% 剩 {pool.available_quota}
                  </span>
                ))}
                {!earlyBird.length && <span>尚無早鳥配額</span>}
              </div>
            </div>
          </section>

          <section className="panel booking-panel">
            <div className="panel-heading">
              <h2>選位訂票</h2>
              <span>最多 6 張</span>
            </div>
            <div className="booking-tools">
              <label>
                票種
                <select value={ticketType} onChange={(event) => setTicketType(event.target.value as TicketType)}>
                  {Object.entries(ticketTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="fare-summary">
                <span>單張估算 NT$ {Math.round(basePrice * ticketDiscounts[ticketType])}</span>
                <strong>總計 NT$ {estimatedTotal}</strong>
              </div>
              <button type="button" className="primary-button" onClick={createOrder} disabled={busy || !selectedSeatIds.length}>
                建立訂單
              </button>
              <button type="button" className="secondary-button" onClick={joinWaitlist} disabled={busy || !user || !selectedSchedule}>
                加入候補
              </button>
            </div>
            <div className="seat-grid">
              {seats.slice(0, 120).map((seat) => (
                <button
                  type="button"
                  key={seat.seat_id}
                  className={`seat ${seat.is_business_class ? 'business' : ''} ${selectedSeatIds.includes(seat.seat_id) ? 'picked' : ''}`}
                  onClick={() => toggleSeat(seat.seat_id)}
                  title={`${seat.carriage_no} 車 ${seat.row_no}${seat.seat_letter}`}
                >
                  <span>{seat.carriage_no}</span>
                  {seat.row_no}{seat.seat_letter}
                </button>
              ))}
              {!seats.length && <p className="muted">選擇班次後會顯示可劃位座位。</p>}
            </div>
            {selectedSeats.length > 0 && (
              <p className="muted">
                已選：{selectedSeats.map((seat) => `${seat.carriage_no}車${seat.row_no}${seat.seat_letter}`).join('、')}
              </p>
            )}
          </section>
        </section>
      </section>

      <section className="lower-grid">
        <div className="panel">
          <div className="panel-heading">
            <h2>我的訂單</h2>
            <button type="button" className="ghost-button" onClick={refreshOrders} disabled={!user}>
              更新
            </button>
          </div>
          <OrderList orders={orders} onUpdate={updateOrder} />
        </div>
        <div className="panel">
          <div className="panel-heading">
            <h2>訂位代號查詢</h2>
          </div>
          <form className="lookup-form" onSubmit={lookupOrder}>
            <input
              value={bookingCode}
              onChange={(event) => setBookingCode(event.target.value)}
              placeholder="輸入 8 碼訂位代號"
            />
            <button type="submit" className="secondary-button">
              查詢
            </button>
          </form>
          {lookedUpOrder && <OrderCard order={lookedUpOrder} />}
        </div>
        <div className="panel">
          <div className="panel-heading">
            <h2>候補</h2>
            <button type="button" className="ghost-button" onClick={refreshWaitlists} disabled={!user}>
              更新
            </button>
          </div>
          <div className="compact-list">
            {waitlists.map((item) => (
              <div key={item.waitlist_id} className="mini-row">
                <strong>#{item.waitlist_id}</strong>
                <span>{item.preferred_seat_type} / {item.status}</span>
              </div>
            ))}
            {!waitlists.length && <p className="muted">尚無候補紀錄。</p>}
          </div>
        </div>
      </section>
    </main>
  )
}

function OrderList({ orders, onUpdate }: { orders: Order[]; onUpdate: (orderId: number, action: 'pay' | 'cancel') => void }) {
  if (!orders.length) return <p className="muted">登入後可查看自己的訂單。</p>

  return (
    <div className="order-list">
      {orders.map((order) => (
        <OrderCard key={order.order_id} order={order} onUpdate={onUpdate} />
      ))}
    </div>
  )
}

function OrderCard({ order, onUpdate }: { order: Order; onUpdate?: (orderId: number, action: 'pay' | 'cancel') => void }) {
  const tickets = order.tickets ?? order.order_tickets ?? []

  return (
    <article className="order-card">
      <div>
        <strong>{order.booking_code}</strong>
        <span className={`status ${order.payment_status}`}>{order.payment_status}</span>
      </div>
      <p>NT$ {order.total_amount} / {tickets.length} 張 / #{order.order_id}</p>
      {tickets.length > 0 && (
        <div className="ticket-list">
          {tickets.slice(0, 4).map((ticket) => (
            <span key={ticket.ticket_id}>
              {ticket.seat ? `${ticket.seat.carriage_no}車${ticket.seat.row_no}${ticket.seat.seat_letter}` : `座位 ${ticket.seat_id}`}
              {' '} {ticketTypeLabels[ticket.ticket_type] ?? ticket.ticket_type}
            </span>
          ))}
        </div>
      )}
      {onUpdate && order.payment_status === 'unpaid' && (
        <div className="row-actions">
          <button type="button" className="secondary-button" onClick={() => onUpdate(order.order_id, 'pay')}>
            付款
          </button>
          <button type="button" className="ghost-button" onClick={() => onUpdate(order.order_id, 'cancel')}>
            取消
          </button>
        </div>
      )}
    </article>
  )
}

function formatTime(value?: string | null) {
  if (!value) return '--:--'
  return value.slice(0, 5)
}

function readError(err: unknown) {
  return err instanceof Error ? err.message : '操作失敗'
}

export default App
