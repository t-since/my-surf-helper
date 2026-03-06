import React, { useState, useEffect, useMemo } from 'react';
import { Waves, Wind, Navigation, CheckCircle2, Info, MapPin, RefreshCw, AlertTriangle, ExternalLink, Calendar, XCircle, Car, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';

const App = () => {
  // 스팟 정보
  const spots = {
    '양양 죽도': { lat: 38.025, lng: 128.718 },
    '양양 인구': { lat: 38.020, lng: 128.719 },
    '양양 동산': { lat: 38.016, lng: 128.724 },
    '양양 기사문': { lat: 38.012, lng: 128.728 },
    '고성 송지호': { lat: 38.337, lng: 128.513 },
    '고성 봉포': { lat: 38.246, lng: 128.567 },
  };

  const next7Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, []);

  const [selectedSpot, setSelectedSpot] = useState('양양 죽도');
  const [selectedDate, setSelectedDate] = useState(next7Days[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSurfData = async (spotName, dateStr) => {
    setLoading(true);
    setError(null);
    const spot = spots[spotName];
    try {
      const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${spot.lat}&longitude=${spot.lng}&hourly=wave_height,wave_period,wave_direction&timezone=Asia%2FSeoul`;
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${spot.lat}&longitude=${spot.lng}&hourly=wind_speed_10m,wind_direction_10m&timezone=Asia%2FSeoul`;

      const [marineRes, weatherRes] = await Promise.all([fetch(marineUrl), fetch(weatherUrl)]);
      const marineJson = await marineRes.json();
      const weatherJson = await weatherRes.json();

      const targetTimeStr = `${dateStr}T13:00`;
      const timeIdx = marineJson.hourly.time.indexOf(targetTimeStr);
      const finalIdx = timeIdx !== -1 ? timeIdx : 0;

      const getWindDir = (deg) => {
        if (deg >= 225 && deg <= 315) return 'W';
        if (deg > 315 || deg < 45) return 'N';
        if (deg >= 45 && deg <= 135) return 'E';
        return 'S';
      };

      setData({
        waveHeight: marineJson.hourly.wave_height[finalIdx],
        period: marineJson.hourly.wave_period[finalIdx],
        windDir: getWindDir(weatherJson.hourly.wind_direction_10m[finalIdx]),
        windSpeed: weatherJson.hourly.wind_speed_10m[finalIdx],
      });
    } catch (err) {
      setError("데이터를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurfData(selectedSpot, selectedDate);
  }, [selectedSpot, selectedDate]);

  const analyzeConditions = (d) => {
    if (!d) return null;
    let score = 0;
    let pros = [];
    let cons = [];
    
    // 파고 점수
    if (d.waveHeight >= 0.4 && d.waveHeight <= 0.9) {
      score += 45;
      pros.push("초보자가 거품 파도에서 일어서기 가장 좋은 높이입니다.");
    } else if (d.waveHeight > 1.2) {
      cons.push("파도가 거칠어 라인업(바다 멀리) 나가기가 매우 힘듭니다.");
    } else if (d.waveHeight < 0.2) {
      cons.push("보드가 밀리지 않아 패들링 연습만 하게 될 수 있습니다.");
    }

    // 풍향 점수
    const isOffshore = ['W', 'NW', 'SW'].includes(d.windDir);
    if (isOffshore) {
      score += 40;
      pros.push("오프쇼어 바람 덕분에 파도가 깨끗하게 유지됩니다.");
    } else {
      cons.push("온쇼어 바람이 파도를 짓눌러서 길이 잘 안 날 수 있습니다.");
    }

    // 주기 점수
    if (d.period >= 6) {
      score += 15;
      pros.push("파도 간격이 여유로워 체력 안배에 유리합니다.");
    }

    // 서울 서퍼 전용 코멘트 생성
    let travelAdvice = "";
    let travelColor = "";
    let travelIcon = null;

    if (score >= 85) {
      travelAdvice = "왕복 4시간이 전혀 아깝지 않습니다. 무조건 출발하세요!";
      travelColor = "bg-green-600";
      travelIcon = <ThumbsUp size={20} />;
    } else if (score >= 60) {
      travelAdvice = "갈만합니다! 다만 아주 완벽하진 않으니 큰 기대보다는 연습에 집중하세요.";
      travelColor = "bg-blue-600";
      travelIcon = <Car size={20} />;
    } else if (score >= 40) {
      travelAdvice = "음... 애매합니다. 연습은 가능하지만 가성비를 생각하면 다음을 기약해 보세요.";
      travelColor = "bg-yellow-600";
      travelIcon = <AlertCircle size={20} />;
    } else {
      travelAdvice = "안 가는 것을 추천합니다. 서울에서 기름값이 아까운 컨디션이에요.";
      travelColor = "bg-red-600";
      travelIcon = <ThumbsDown size={20} />;
    }

    let status = score >= 80 ? "서핑 강추!" : score >= 50 ? "연습 가능" : "비추천";
    let color = score >= 80 ? "text-green-600" : score >= 50 ? "text-blue-600" : "text-red-500";
    let bg = score >= 80 ? "bg-green-50" : score >= 50 ? "bg-blue-50" : "bg-red-50";

    return { status, pros, cons, color, bg, travelAdvice, travelColor, travelIcon, score };
  };

  const analysis = analyzeConditions(data);

  const formatDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    const day = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return `${mm}/${dd}(${day})`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Waves className="text-blue-600" /> 서프-헬퍼
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic tracking-tighter">Seoul Surfer's Guide</p>
          </div>
          <button onClick={() => fetchSurfData(selectedSpot, selectedDate)} className="p-2 bg-white rounded-full shadow-sm border active:scale-95 transition-transform">
            <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </header>

        {/* 스팟 및 날짜 선택 */}
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {Object.keys(spots).map(spot => (
              <button key={spot} onClick={() => setSelectedSpot(spot)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedSpot === spot ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'}`}>
                {spot}
              </button>
            ))}
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex gap-2 overflow-x-auto no-scrollbar">
            {next7Days.map(date => (
              <button key={date} onClick={() => setSelectedDate(date)} className={`flex flex-col items-center min-w-[62px] py-3 rounded-xl transition-all ${selectedDate === date ? 'bg-blue-50 border-2 border-blue-500 text-blue-700' : 'bg-gray-50 text-gray-400'}`}>
                <span className="text-[10px] font-bold opacity-60 uppercase">{date.split('-')[2]}일</span>
                <span className="text-sm font-black">{formatDateLabel(date).split('/')[1].replace(/\(.\)/, '')}</span>
                <span className="text-[10px] font-bold">{formatDateLabel(date).slice(-3)}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-bold">서울에서 출발 전, 차트 분석 중...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 서울 서퍼 전용 '출발 결정' 카드 */}
            <div className={`${analysis.travelColor} text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden transition-all duration-500`}>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 opacity-80">
                  <Car size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Seoul Surfer's Decision</span>
                </div>
                <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                   {analysis.travelIcon} {analysis.travelAdvice}
                </h3>
                <p className="text-xs text-white/80 font-medium leading-relaxed">
                  편도 2시간, 왕복 4시간의 소중한 시간을 고려한 최종 제안입니다.
                </p>
              </div>
              <div className="absolute -bottom-6 -right-6 text-white/10 rotate-12">
                <Car size={150} />
              </div>
            </div>

            {/* 상세 데이터 분석 카드 */}
            <div className={`p-8 rounded-[2.5rem] shadow-md border-4 transition-all ${analysis.bg} ${analysis.color.replace('text', 'border')}`}>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-[10px] font-black text-slate-400 mb-4 shadow-sm border border-slate-100">
                  <MapPin size={12} className="text-red-500" /> {selectedSpot} · {formatDateLabel(selectedDate)}
                </div>
                <h2 className={`text-4xl font-black mb-2 ${analysis.color}`}>{analysis.status}</h2>
                <div className="flex justify-center gap-1">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`w-3 h-1 rounded-full ${i <= analysis.score/20 ? 'bg-current' : 'bg-slate-200'} ${analysis.color}`}></div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { icon: Waves, label: '파고', val: `${data.waveHeight}m`, color: 'text-blue-500' },
                  { icon: Wind, label: '풍향', val: data.windDir, color: 'text-slate-600' },
                  { icon: Navigation, label: '주기', val: `${data.period}s`, color: 'text-orange-500' }
                ].map((item, i) => (
                  <div key={i} className="bg-white p-4 rounded-3xl text-center shadow-sm">
                    <item.icon className={`w-5 h-5 mx-auto mb-1 ${item.color}`} />
                    <span className="block text-[10px] font-bold text-slate-400">{item.label}</span>
                    <span className="text-lg font-black">{item.val}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                {analysis.pros.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-green-600 ml-1">오늘의 장점 (GOOD)</div>
                    {analysis.pros.map((msg, i) => (
                      <div key={i} className="flex items-start gap-3 bg-white/70 p-3 rounded-2xl text-xs font-bold text-slate-700 border border-green-100">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-green-500" /> {msg}
                      </div>
                    ))}
                  </div>
                )}
                {analysis.cons.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-red-600 ml-1">현장 주의사항 (CAUTION)</div>
                    {analysis.cons.map((msg, i) => (
                      <div key={i} className="flex items-start gap-3 bg-white/70 p-3 rounded-2xl text-xs font-bold text-slate-700 border border-red-100">
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" /> {msg}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Info size={18} className="text-blue-500" />
                <h3 className="font-bold">서울 서퍼를 위한 꿀팁</h3>
              </div>
              <ul className="text-xs text-slate-500 space-y-2 leading-relaxed font-medium">
                <li className="flex gap-2"><span>•</span> 주말 영동고속도로 정체를 고려하면 오전 10시 이전 도착이 가장 좋습니다.</li>
                <li className="flex gap-2"><span>•</span> 파고가 0.4m 미만일 때는 숏보드보다는 부력이 큰 롱보드 대여를 추천합니다.</li>
                <li className="flex gap-2"><span>•</span> 예보가 애매할 때는 서프샵 인스타그램의 '아침 파도 영상'을 교차 확인하세요.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
