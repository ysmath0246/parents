

import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// 외부에서 초기화된 db 객체만 가져옵니다
import { db } from './firebase';

// Firestore CRUD 메서드 한 번만 임포트
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';

function App() {
  // === 로그인 상태 ===
  const [birthId, setBirthId] = useState(localStorage.getItem('lastBirthId') || '');
  const [pin, setPin] = useState(localStorage.getItem('lastPin') || '');
  const [rememberInputs, setRememberInputs] = useState(true);
  const [error, setError] = useState('');
  const [studentId, setStudentId] = useState(localStorage.getItem('studentId') || '');
  const [studentName, setStudentName] = useState(localStorage.getItem('studentName') || '');
  const [page, setPage] = useState(studentId ? 'notices' : 'login');
const paymentMethods = ['카드', '계좌이체', '결제선생'];

const [answers, setAnswers] = useState([]);

  // === 로그인 기록 구독 및 표시 ===
  const [loginLogs, setLoginLogs] = useState([]);
  useEffect(() => {
    if (!studentName) return;
    const q = collection(db, 'routines');
getDocs(q).then(snap => {
  const list = snap.docs
    .map(d => ({
      id: d.id,
      data: d.data()
    }))
    .filter(doc => doc.id.startsWith(studentName + '_'));
  
  setDocsList(list);

  // 최신 순으로 정렬하고 첫 번째 선택
  const sorted = [...list].sort((a, b) => {
    const aNum = Number(a.id.split('_')[1] || '0');
    const bNum = Number(b.id.split('_')[1] || '0');
    return bNum - aNum;
  });
  
  if (sorted.length > 0) {
    setSelectedDocId(sorted[0].id);
  }
});

    const unsub = onSnapshot(q, snap => {
      setLoginLogs(snap.docs.map(d => d.data()));
    });
    return () => unsub();
  }, [studentName]);

  // === 로그인 핸들러 ===
const handleLogin = async (e) => {
  e.preventDefault();    setError('');
    if (birthId.length !== 6 || pin.length !== 4) {
      setError('생년월일 6자리와 전화번호 뒤 4자리를 입력해주세요.');
      return;
    }
    const snap = await getDocs(collection(db, 'students'));
    const match = snap.docs.find(d => {
      const data = d.data();
      const sb = data.birth.replace(/\D/g, '').slice(-6);
      const pp = data.parentPhone.replace(/\D/g, '').slice(-4);
      return sb === birthId && pp === pin;
    });
    if (!match) {
      setError('아이디 또는 비밀번호가 일치하지 않습니다.');
      return;
    }
    const data = match.data();
    localStorage.setItem('studentId', match.id);
    localStorage.setItem('studentName', data.name);
    if (rememberInputs) {
      localStorage.setItem('lastBirthId', birthId);
      localStorage.setItem('lastPin', pin);
    }
    await addDoc(collection(db, 'parentLogins'), {
      studentName: data.name,
      loginTime: new Date().toISOString()
    });

 const loginTs = Date.now(); // ms 단위
   localStorage.setItem('loginTime', loginTs.toString());

    setStudentId(match.id);
    setStudentName(data.name);
    setPage('notices');
  };

  // === 로그아웃 핸들러 ===
  const handleLogout = () => {
    localStorage.clear();
    setStudentId('');
    setStudentName('');
    setPage('login');
  };

  // === NoticesPage 데이터 불러오기 ===
  const [notices, setNotices] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [noticeDetails, setNoticeDetails] = useState({});
  const [holidays, setHolidays] = useState([]);
  useEffect(() => {
    getDocs(collection(db, 'notices')).then(snap =>
      setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    getDocs(collection(db, 'holidays')).then(snap => {
      const now = new Date();
      const fmt = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
      const months = [new Date(now.getFullYear(), now.getMonth()-1,1), now, new Date(now.getFullYear(), now.getMonth()+1,1)].map(fmt);
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(h => months.some(m => h.date.startsWith(m)))
        .sort((a,b) => a.date.localeCompare(b.date));
      setHolidays(arr);
    });
  }, []);
  const toggleNotice = async id => {
    if (expandedId === id) { setExpandedId(null); return; }
    if (!noticeDetails[id]) {
      const snap = await getDoc(doc(db, 'notices', id));
      noticeDetails[id] = snap.data().content;
      setNoticeDetails({ ...noticeDetails });
    }
    setExpandedId(id);
  };

  // === PaymentPage 데이터 구독 ===
  const [docsList, setDocsList] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [docData, setDocData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [paymentDone, setPaymentDone] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState({});
 useEffect(() => {
  if (!studentName) return;
  const q = collection(db, 'routines');
  getDocs(q).then(snap => {
    const list = snap.docs
      .map(d => ({
        id: d.id,
        data: d.data()
      }))
      .filter(doc => doc.id.startsWith(studentName + '_'));
    
    setDocsList(list);

    // 최신 루틴 자동 선택 (번호 높은 순)
    const sorted = [...list].sort((a, b) => {
      const aNum = Number(a.id.split('_')[1] || '0');
      const bNum = Number(b.id.split('_')[1] || '0');
      return bNum - aNum;
    });

    if (!selectedDocId && sorted.length > 0) {
      setSelectedDocId(sorted[0].id);
    }
  });
}, [studentName]);

  useEffect(() => {
  const f = docsList.find(d => d.id === selectedDocId);
  if (f) {
    setDocData(f.data);
    const studentObj = f.data.students?.[studentId];
    if (studentObj?.sessions) {
      const arr = Object.values(studentObj.sessions);
      setSessions(arr);

      (async () => {
        const newAttendanceRecords = {};
        await Promise.all(
          arr.map(async s => {
            const snap = await getDoc(doc(db, 'attendance', s.date));
            if (snap.exists()) {
              const data = snap.data();
              if (data[studentName]) {
                newAttendanceRecords[s.date] = {
                  status: data[studentName].status,
                  time: data[studentName].time
                };
              }
            }
          })
        );
        setAttendanceRecords(newAttendanceRecords);
      })();
    } else {
      setSessions([]);
      setAttendanceRecords({});
    }

    const routineNumber = selectedDocId?.split('_')[1];
    const paymentDocId = `${studentName}_${routineNumber}`;
    getDoc(doc(db, 'payment_completed', paymentDocId))
      .then(snap => {
        if (snap.exists() && snap.data().paymentComplete) {
          setPaymentDone(true);
        } else {
          setPaymentDone(false);
        }
      })
      .catch(err => {
        console.error("결제 상태 불러오기 오류", err);
        setPaymentDone(false);
      });
  }
}, [selectedDocId, docsList, studentId]);

  // === CommentsPage 데이터 구독 ===
  const [comments, setComments] = useState([]);
  const [replies, setReplies] = useState({});
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editedReplyText, setEditedReplyText] = useState('');
  useEffect(() => {
    if (!studentId) return;
    return onSnapshot(collection(db, 'comments'), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.studentId === studentId);
      setComments(all);
    });
  }, [studentId]);



 // answer(답변) 콜렉션 구독
 useEffect(() => {
   if (!studentId) return;
   const unsub = onSnapshot(collection(db, 'answer'), snap => {
     const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
       .filter(a => a.studentId === studentId);
     setAnswers(all);
   });
   return () => unsub();
 }, [studentId]);


  const handleReply = async cid => {
    const txt = (replies[cid] || '').trim();
    if (!txt) return alert('댓글을 입력하세요.');
    const sd = (await getDoc(doc(db, 'students', studentId))).data().name;
   const today = new Date().toISOString().slice(0,10);
  // 문서 ID: 학생이름_날짜
   const docName = `${studentName}_${today}`; // ex. "조예린_2025-07-12"

 await setDoc(
   doc(db, 'answer', docName),
   {
     studentId,
     studentName,
     comment: `답변:${txt}`,
     date: today,
     parentId: cid,
   }
 );
    setReplies({ ...replies, [cid]: '' });
  };
  const handleDeleteReply = async id => {
    if (window.confirm('삭제하시겠습니까?')) await deleteDoc(doc(db, 'comments', id));
  };
  const handleUpdateReply = async id => {
    if (!editedReplyText.trim()) return;
    await updateDoc(doc(db, 'comments', id), { comment: `답변:${editedReplyText}` });
    setEditingReplyId(null);
    setEditedReplyText('');
  };

  // === BooksPage 데이터 구독 및 CSV 다운로드 ===
  const [books, setBooks] = useState([]);
  const [sortKey, setSortKey] = useState('');
  useEffect(() => {
    if (!studentId) return;
    return onSnapshot(collection(db, 'books'), qs => {
      const all = qs.docs.map(d => ({ id: d.id, ...d.data() }));
      setBooks(all.filter(b => b.studentId === studentId));
    });
  }, [studentId]);
  const sortedBooks = useMemo(() => {
    if (!sortKey) return books;
    const a = [...books];
  if (sortKey === 'grade') return a.sort((x,y) => (x.grade || '').localeCompare(y.grade || ''));
    if (sortKey === 'title') return a.sort((x,y) => x.title.localeCompare(y.title));
    if (sortKey === 'completedDate') return a.sort((x,y) => x.completedDate.localeCompare(y.completedDate));
    return a;
  }, [books, sortKey]);

 // ─── 30분 세션 만료 및 창 닫힘 처리 ───
 useEffect(() => {
   // 30분(밀리초) 설정
   const SESSION_LIMIT = 30 * 60 * 1000;

   // 세션 유효성 검사
   const checkSession = () => {
     const loginTs = parseInt(localStorage.getItem('loginTime') || '0', 10);
     if (loginTs > 0 && Date.now() - loginTs > SESSION_LIMIT) {
       handleLogout();
     }
   };

   // 1분마다 검사
   const intervalId = setInterval(checkSession, 60 * 1000);

   // 창/탭 닫힐 때도 로그아웃
   window.addEventListener('beforeunload', handleLogout);

   return () => {
     clearInterval(intervalId);
     window.removeEventListener('beforeunload', handleLogout);
   };
 }, []);
 
  // === 렌더링 ===
  if (page === 'login') {
   return (
     <div style={{ padding: 24 }}>
       <h1>학부모 로그인</h1>
       <form onSubmit={handleLogin}>
         <input
           placeholder='생년월일 6자리 (YYMMDD)'
           value={birthId}
           onChange={e => setBirthId(e.target.value.replace(/\D/g, ''))}
         />
         <input
           placeholder='전화번호 뒤 4자리'
           type='password'
           value={pin}
           onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
         />
         <label>
           <input
             type='checkbox'
             checked={rememberInputs}
             onChange={e => setRememberInputs(e.target.checked)}
           /> 자동 기억
         </label>
         {/* submit 버튼으로 바뀜 */}
         <button type="submit">로그인</button>
       </form>
       {error && <p style={{ color: 'red' }}>{error}</p>}
     </div>
   );
 }




  return (
    <div style={{ padding: 24 }}>
      {/* 내비게이션 */}
      <nav style={{ marginBottom: 16 }}>
        {['notices','payment','comments','books'].map(tab => (
          <button
            key={tab}
            onClick={() => setPage(tab)}
            style={{
              marginRight: 8,
              background: page === tab ? '#007bff' : '#ccc',
              color: '#fff'
            }}
          >
            {tab === 'notices' ? '공지사항'
              : tab === 'payment' ? '출석 및 결제'
              : tab === 'comments' ? '코멘트'
              : '완북교재'}
          </button>
        ))}
        <button onClick={handleLogout} style={{ marginLeft: 16, background: '#f44336', color: '#fff' }}>
          로그아웃
        </button>
      </nav>

     {studentName === '관리자' && loginLogs.length > 0 && (
  <div style={{ marginBottom: 16, fontSize: 12, color: '#555' }}>
    <strong>로그인 히스토리:</strong>
    <ul>
      {loginLogs.map((log, i) => (
        <li key={i}>{new Date(log.loginTime).toLocaleString()}</li>
      ))}
    </ul>
  </div>
)}


      {/* 페이지별 렌더링 */}
   {page === 'notices' && (
  <section>
     <div style={{ background: '#f9f9f9', padding: 12, borderRadius: 8 }}>
      <h2>📅 이번 달 휴일</h2>
      <ul>
        {holidays.map(h => (
          <li key={h.id} style={{ marginBottom: 4 }}>
            <strong>{h.name}</strong> — <span style={{ color: 'red' }}>{h.date}</span>
          </li>
        ))}
      </ul>
    </div>


    <h1 style={{ marginTop: 24, display:'flex', alignItems:'center' }}>
      <span>📣 공지사항</span>
      <small style={{ marginLeft: 12, color:'#666' }}>클릭해서 펼쳐보기</small>
    </h1>

    <ul style={{ listStyle: 'none', padding: 0 }}>
      {/*
         notices를 복사해서 date 내림차순으로 정렬
      */}
      {[...notices]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(n => (
          <li
            key={n.id}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: 6,
              marginBottom: 12,
              overflow: 'hidden',
              boxShadow: expandedId === n.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
              transition: 'box-shadow 0.2s'
            }}
          >
            <div
              onClick={() => toggleNotice(n.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: expandedId === n.id ? '#f0f8ff' : '#fff',
                cursor: 'pointer'
              }}
            >
              <div>
                <strong>{n.title}</strong>
                <span style={{ marginLeft: 8, color: '#888' }}>({n.date})</span>
              </div>
              <div style={{
                transform: expandedId === n.id ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                fontSize: 14,
                color: '#555'
              }}>
                ▶
              </div>
            </div>
            {expandedId === n.id && (
              <div
                style={{
                  padding: '16px',
                  background: '#fafafa',
                  borderTop: '1px solid #eee',
                  lineHeight: 1.5,
                  color: '#333'
                }}
                dangerouslySetInnerHTML={{ __html: noticeDetails[n.id] }}
              />
            )}
          </li>
        ))
      }
    </ul>
  </section>
)}


     {page === 'payment' && (
  <section>
    {/* ① 루틴 넘버 */}
    {selectedDocId && (
      <h3 style={{
        textAlign: 'center',
        margin: '20px 0',
        fontSize: '24px',
        fontWeight: 'bold'
      }}>
        루틴 번호 {selectedDocId.split('_')[1]}
      </h3>
    )}

    {/* 루틴 문서 선택 */}
    <label style={{ display: 'block', marginBottom: '16px' }}>
      루틴 문서:
      <select
        value={selectedDocId}
        onChange={e => setSelectedDocId(e.target.value)}
        style={{ marginLeft: '8px' }}
      >
        {docsList.map(d => (
          <option key={d.id} value={d.id}>
            {d.id}
          </option>
        ))}
      </select>
    </label>

    {/* ② 결제 방법 선택 */}
    <div style={{ margin: '16px 0' }}>
      {paymentMethods.map(m => (
        <button
          key={m}
          onClick={() => setSelectedPayments(p => ({ ...p, [selectedDocId]: m }))}
          style={{
            marginRight: 8,
            background: selectedPayments[selectedDocId] === m ? '#007bff' : '#ccc',
            color: '#fff',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {m}
        </button>
      ))}
      <button
      onClick={async () => {
  if (!selectedDocId) {
    alert('루틴 문서를 선택해주세요.');
    return;
  }

  const parts = selectedDocId.split('_');
  const routineNumber = parts.length > 1 ? parts[1] : '';

  if (!routineNumber) {
    alert('루틴 번호가 잘못되었습니다.');
    return;
  }

  await setDoc(
    doc(db, 'payments', `${studentName}_${routineNumber}`),
    {
      studentId,
      studentName,
      routineNumber: Number(routineNumber),
      paymentMethod: selectedPayments[selectedDocId] || '',
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
  alert('저장되었습니다.');
}}

        style={{
          marginLeft: 16,
          background: '#28a745',
          color: '#fff',
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        저장
      </button>
    </div>

    {/* 안내문구 */}
    <p style={{ marginBottom: '16px' }}>
      {selectedPayments[selectedDocId] === '카드' && '➡️ 카드 안내'}
      {selectedPayments[selectedDocId] === '계좌이체' && '➡️ 계좌 안내'}
      {selectedPayments[selectedDocId] === '결제선생' && '➡️ 선생 결제 안내'}
    </p>

    {/* ③ 결제 완료 여부 */}
    <div style={{
      margin: '16px 0',
      fontSize: '18px',
      fontWeight: 'bold',
      color: paymentDone ? '#28a745' : '#dc3545'
    }}>
      {paymentDone ? '✅ 결제 완료' : '❌ 미결제'}
    </div>

    {/* ④ 세션 표 */}
    <table style={{
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '20px'
    }}>
      <thead style={{ background: '#007bff', color: '#fff' }}>
        <tr>
          <th style={{ padding: '8px', border: '1px solid #ccc' }}>세션</th>
          <th style={{ padding: '8px', border: '1px solid #ccc' }}>날짜</th>
          <th style={{ padding: '8px', border: '1px solid #ccc' }}>출석</th>
          <th style={{ padding: '8px', border: '1px solid #ccc' }}>시간</th>
        </tr>
      </thead>
      <tbody>
        {sessions.length > 0 ? (
          sessions.map((s, i) => {
const rec = attendanceRecords[(s.date || '').trim()] || {};
            return (
              <tr
                key={i}
                style={{ background: i % 2 === 0 ? '#f9f9f9' : '#fff' }}
              >
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                  {s.session}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                  {s.date}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                  {rec.status || '-'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                  {rec.time || '-'}
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan="4" style={{
              padding: '16px',
              textAlign: 'center'
            }}>
              데이터가 없습니다.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </section>
)}


      {page === 'comments' && (
        <section>
          <h2>📝 코멘트</h2>
          <ul>
            {comments.map(c => !c.comment.startsWith('답변:') && (
              <li key={c.id}>
                <div>{c.comment} ({c.date})</div>
                 {/* → answer(답변) 컬렉션에서 필터 후 바로 렌더링 */}
         {answers
           .filter(a => a.parentId === c.id)
           .map(a => (
             <div key={a.id}>
               💬 {a.comment.replace('답변:', '')}
             </div>
         ))}
               
                <div>
                  <input
                    placeholder='답변 입력'
                    value={replies[c.id] || ''}
                    onChange={e => setReplies(p => ({ ...p, [c.id]: e.target.value }))}
                  />
                  <button onClick={() => handleReply(c.id)}>저장</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {page === 'books' && (
        <section>
          <h2>📚 완북 교재</h2>
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => {
              const csv = [
                ['번호','이름','학년','제목','완료일'],
                ...sortedBooks.map((b,i) => [i+1,b.name,b.grade,b.title,b.completedDate])
              ].map(r => r.join(',')).join('\n');
              const url = URL.createObjectURL(new Blob([csv]));
              const a = document.createElement('a');
              a.href = url;
              a.download = `books_${new Date().toISOString().slice(0,10)}.csv`;
              a.click();
            }}>엑셀 다운로드</button>
            <button onClick={() => setSortKey('grade')}>학년정렬</button>
            <button onClick={() => setSortKey('title')}>제목정렬</button>
            <button onClick={() => setSortKey('completedDate')}>완료일정렬</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th>번호</th><th>이름</th><th>학년</th><th>제목</th><th>완료일</th></tr>
            </thead>
            <tbody>
              {sortedBooks.map((b,i) => (
                <tr key={b.id}>
                  <td>{i+1}</td><td>{b.name}</td><td>{b.grade}</td><td>{b.title}</td><td>{b.completedDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

// 파일 끝
