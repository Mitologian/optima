/* =========================
   DO GET — Single Page App
========================= */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Main');
  return template.evaluate()
    .setTitle('BNI Ventura')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

/* =========================
   GET MEMBERS (all, with LT flag)
   Members sheet columns:
   A=MemberName B=Team C=Leader D=Active E=IsLaunchTeam
========================= */
function getMembers() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Members');
  const data  = sheet.getDataRange().getDisplayValues();
  data.shift();
  return data
    .filter(r => r[0] && r[0].toString().trim())
    .map(r => ({
      memberName:   r[0].toString().trim(),
      team:         r[1] || '',
      leader:       r[2] || '',
      active:       r[3],
      isLaunchTeam: (r[4] || '').toString().toUpperCase() === 'TRUE'
    }));
}

function getAllInviters() {
  return getMembers().map(m => ({
    memberName: m.memberName, team: m.team, isLaunchTeam: m.isLaunchTeam
  }));
}

function getTeams() {
  return [...new Set(
    getMembers().filter(m => !m.isLaunchTeam).map(m => m.team).filter(Boolean)
  )].sort();
}

function getDynamicTarget_(currentMembers) {
  if (currentMembers < 51) return 51;
  if (currentMembers < 75) return 75;
  return 100;
}

/* =========================
   TEAM ASSIGNMENT CONFIG
   Rule:
   - Max 7 regular members per team
   - New Joined_Ventura member goes to referred team if crossTeamRef exists
   - Otherwise goes to inviter team
   - If requested team is full, assign to next new team number
   - Launch Team invite still uses manual selected team, but also respects max 7
========================= */
const MAX_MEMBERS_PER_TEAM = 7;

function getRegularMemberRows_() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Members');
  const data  = sheet.getDataRange().getDisplayValues();
  data.shift();

  return data.filter(r =>
    r[0] &&
    r[0].toString().trim() &&
    (r[4] || '').toString().toUpperCase() !== 'TRUE'
  );
}

function getTeamCount_(teamName) {
  const team = (teamName || '').toString().trim();
  if (!team) return 0;

  return getRegularMemberRows_().filter(r =>
    (r[1] || '').toString().trim() === team
  ).length;
}

function getNextTeamName_() {
  const rows = getRegularMemberRows_();
  let maxNum = 0;

  rows.forEach(r => {
    const team = (r[1] || '').toString().trim();
    const match = team.match(/^Team\s+(\d+)$/i);
    if (match) maxNum = Math.max(maxNum, Number(match[1]) || 0);
  });

  return 'Team ' + (maxNum + 1);
}

function resolveJoinTeam_(preferredTeam) {
  const requestedTeam = (preferredTeam || '').toString().trim();

  if (!requestedTeam) {
    return {
      finalTeam: getNextTeamName_(),
      requestedTeam: '',
      reassigned: true,
      reason: 'no_team_selected'
    };
  }

  const count = getTeamCount_(requestedTeam);

  if (count >= MAX_MEMBERS_PER_TEAM) {
    return {
      finalTeam: getNextTeamName_(),
      requestedTeam: requestedTeam,
      reassigned: true,
      reason: 'team_full'
    };
  }

  return {
    finalTeam: requestedTeam,
    requestedTeam: requestedTeam,
    reassigned: false,
    reason: 'team_available'
  };
}

/* =========================
   ENSURE MEMBER EXISTS
========================= */
function ensureMemberExists_(memberName, teamName) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Members');
  const data  = sheet.getDataRange().getDisplayValues();
  data.shift();

  const cleanName = (memberName || '').toString().trim();
  if (!cleanName) return { added: false, message: 'Missing member name' };

  const existing = data.find(r =>
    (r[0] || '').toString().trim().toLowerCase() === cleanName.toLowerCase()
  );

  if (existing) {
    return {
      added: false,
      message: 'Member already exists',
      finalTeam: existing[1] || '',
      reassigned: false,
      reason: 'already_exists'
    };
  }

  const assignment = resolveJoinTeam_(teamName);
  const finalTeam = assignment.finalTeam;

  const same = data.find(r =>
    (r[1] || '').toString().trim() === finalTeam
  );

  const leader = same ? (same[2] || '') : '';

  sheet.appendRow([
    cleanName,
    finalTeam,
    leader,
    'TRUE',
    ''
  ]);

  return {
    added: true,
    leader: leader,
    finalTeam: finalTeam,
    requestedTeam: assignment.requestedTeam,
    reassigned: assignment.reassigned,
    reason: assignment.reason
  };
}

/* =========================
   ADD LOCKED CLASSIFICATION (internal helper)
   Dipanggil saat:
   1. Visitor Joined_Ventura (business field = classification)
   2. Wanted request di-fulfill
   Cek duplikat sebelum menambah.
========================= */
function addLockedClassification_(memberName, teamName, classification) {
  if (!memberName || !classification) return;
  const sheet = getClassificationsSheet_();
  const data  = sheet.getDataRange().getDisplayValues();
  data.shift();

  // Normalize for comparison — ignore case and extra whitespace
  const normCl   = classification.trim().toLowerCase().replace(/\s+/g,' ');
  const normName = memberName.trim().toLowerCase();

  const exists = data.some(r =>
    r[1] === 'Locked' &&
    (r[3]||'').toString().trim().toLowerCase()                      === normName &&
    (r[2]||'').toString().trim().toLowerCase().replace(/\s+/g,' ')  === normCl
  );
  if (exists) return; // already locked, skip silently

  const id = 'L-' + new Date().getTime();
  sheet.appendRow([id, 'Locked', classification.trim(), memberName.trim(), teamName||'', new Date(), '', '', 'FALSE']);
}

/* =========================
   RULES MAP
========================= */
function getRulesMap() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Rules');
  const data  = sheet.getDataRange().getValues();
  data.shift();
  const map = {};
  data.forEach(r => { if (r[0]) map[r[0].toString().trim()] = Number(r[1]) || 0; });
  return map;
}

/* =========================
   SUBMIT INVITE
========================= */
function submitActivity(formData) {
  const ss              = SpreadsheetApp.getActiveSpreadsheet();
  const activitiesSheet = ss.getSheetByName('Activities');
  const visitorsSheet   = ss.getSheetByName('Visitors');
  const membersSheet    = ss.getSheetByName('Members');
  const rules           = getRulesMap();

  const memberRows = membersSheet.getDataRange().getDisplayValues();
  memberRows.shift();
  const member = memberRows.find(r => r[0] === formData.memberName);
  const team   = member ? member[1] : '';
  const isLT   = member ? (member[4]||'').toString().toUpperCase() === 'TRUE' : false;

  const isCoffee      = formData.inviteType === 'CoffeeSession';
  const action        = isCoffee ? 'Invite_Coffee' : 'Invite';
  const initialStatus = isCoffee ? 'Coffee_Scheduled' : 'Invited';
  const actionPoints  = isLT ? 0 : (rules[action] !== undefined ? rules[action] : (rules['Invite']||0));

  let notesParts = [];
  if (formData.visitDate)    notesParts.push('Date: ' + formData.visitDate);
  if (formData.visitSession) notesParts.push('Session: ' + formData.visitSession);
  if (formData.crossTeamRef) notesParts.push('CrossTeamRef: ' + formData.crossTeamRef);
  if (formData.notes)        notesParts.push(formData.notes);

  if (!isLT) {
    activitiesSheet.appendRow([
      new Date(), formData.memberName||'', team,
      formData.visitorName||'', formData.business||'', action,
      formData.crossTeamRef||'', actionPoints, notesParts.join(' | ')
    ]);
  }

  const visitorData = visitorsSheet.getDataRange().getDisplayValues();
  visitorData.shift();
  const existingIdx = visitorData.findIndex(r => r[0] === formData.visitorName);

  if (existingIdx === -1) {
    visitorsSheet.appendRow([
      formData.visitorName||'', formData.business||'', formData.phone||'',
      formData.memberName||'', team, initialStatus, '',
      new Date(), new Date(),
      isLT ? 'LaunchTeam' : 'Member',
      formData.visitDate||'', formData.visitSession||'', formData.crossTeamRef||''
    ]);
  } else {
    const rr = existingIdx + 2;
    if (!visitorsSheet.getRange(rr,2).getValue() && formData.business)
      visitorsSheet.getRange(rr,2).setValue(formData.business);
    if (!visitorsSheet.getRange(rr,3).getValue() && formData.phone)
      visitorsSheet.getRange(rr,3).setValue(formData.phone);
    visitorsSheet.getRange(rr,9).setValue(new Date());
  }

  return { success: true, points: actionPoints, team, inviteType: formData.inviteType, isLaunchTeam: isLT };
}

/* =========================
   GET OPEN VISITORS
========================= */
function getVisitors() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Visitors');
  const data  = sheet.getDataRange().getDisplayValues();
  data.shift();
  const closed = ['Joined_Ventura','Joined_Other','Declined','Rejected'];
  return data
    .map(r => ({
      visitorName: r[0]||'', business: r[1]||'', phone: r[2]||'',
      invitedBy: r[3]||'', invitedByTeam: r[4]||'', currentStatus: r[5]||'',
      joinTeam: r[6]||'', createdDate: r[7]||'', lastUpdate: r[8]||'',
      inviterType: r[9]||'Member', visitDate: r[10]||'', visitSession: r[11]||'',
      crossTeamRef: r[12]||''
    }))
    .filter(v => v.visitorName && !closed.includes(v.currentStatus));
}

/* =========================
   GET PROSPECTS
========================= */
function getProspects() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Visitors');
  const data  = sheet.getDataRange().getDisplayValues();
  data.shift();
  const closed = ['Joined_Ventura','Joined_Other','Declined','Rejected'];
  return data
    .map(r => ({
      visitorName: r[0]||'', business: r[1]||'', phone: r[2]||'',
      invitedBy: r[3]||'', invitedByTeam: r[4]||'', currentStatus: r[5]||'',
      joinTeam: r[6]||'', createdDate: r[7]||'', lastUpdate: r[8]||'',
      inviterType: r[9]||'Member', visitDate: r[10]||'', visitSession: r[11]||''
    }))
    .filter(v => v.visitorName && !closed.includes(v.currentStatus))
    .sort((a,b) => new Date(a.lastUpdate||a.createdDate||0) - new Date(b.lastUpdate||b.createdDate||0));
}

/* =========================
   UPDATE VISITOR STATUS
========================= */
function updateVisitorStatus(data) {
  const ss              = SpreadsheetApp.getActiveSpreadsheet();
  const visitorsSheet   = ss.getSheetByName('Visitors');
  const activitiesSheet = ss.getSheetByName('Activities');
  const rules           = getRulesMap();

  const visitorRows = visitorsSheet.getDataRange().getDisplayValues();
  visitorRows.shift();
  const idx = visitorRows.findIndex(r => r[0] === data.visitorName);
  if (idx === -1) return { success: false, message: 'Visitor not found' };

  const rr            = idx + 2;
  const visitorName   = visitorRows[idx][0];
  const business      = visitorRows[idx][1];
  const invitedBy     = visitorRows[idx][3];
  const invitedByTeam = visitorRows[idx][4];
  const currentStatus = visitorRows[idx][5];
  const inviterType   = visitorRows[idx][9] || 'Member';
  const crossTeamRef  = visitorRows[idx][12] || '';
  const isLT          = inviterType === 'LaunchTeam';

  if (!data.newStatus) return { success: false, message: 'Status required' };

  let joinTeamValue = '';
  let requestedJoinTeam = '';
  let teamAssignment = null;

  if (data.newStatus === 'Joined_Ventura') {
    if (isLT) {
      requestedJoinTeam = data.joinTeam || '';
    } else if (crossTeamRef) {
      requestedJoinTeam = crossTeamRef;
    } else {
      requestedJoinTeam = invitedByTeam || '';
    }

    teamAssignment = resolveJoinTeam_(requestedJoinTeam);
    joinTeamValue = teamAssignment.finalTeam;
  } else if (data.newStatus === 'Joined_Other') {
    joinTeamValue = 'Other Chapter';
  }

  visitorsSheet.getRange(rr,6).setValue(data.newStatus);
  visitorsSheet.getRange(rr,7).setValue(joinTeamValue);
  visitorsSheet.getRange(rr,9).setValue(new Date());

  const points = isLT ? 0 : (rules[data.newStatus] || 0);

  let activityNote =
    (isLT ? 'LT-invite | ' : '') +
    'Status: ' + currentStatus + ' → ' + data.newStatus;

  if (data.newStatus === 'Joined_Ventura' && teamAssignment) {
    activityNote +=
      ' | RequestedTeam: ' + (teamAssignment.requestedTeam || '-') +
      ' | FinalTeam: ' + teamAssignment.finalTeam;

    if (teamAssignment.reassigned) {
      activityNote += ' | ReassignedReason: ' + teamAssignment.reason;
    }
  }

  activitiesSheet.appendRow([
    new Date(),
    isLT ? 'LAUNCH_TEAM' : (invitedBy||''),
    isLT ? '' : (invitedByTeam||''),
    visitorName, business, data.newStatus, crossTeamRef, points,
    activityNote
  ]);

  let crossTeamBonusAwarded = false;
  if (data.newStatus === 'Joined_Ventura' && !isLT && crossTeamRef && crossTeamRef === joinTeamValue) {
    const bonus = rules['CrossTeamBonus'] || 0;
    if (bonus > 0) {
      activitiesSheet.appendRow([
        new Date(), invitedBy||'', invitedByTeam||'', visitorName, business,
        'CrossTeamBonus', crossTeamRef, bonus,
        'Cross-team referral bonus: ' + visitorName + ' joined ' + joinTeamValue
      ]);
      crossTeamBonusAwarded = true;
    }
  }

  let memberAdded = false;
  let memberAddResult = null;

  if (data.newStatus === 'Joined_Ventura') {
    memberAddResult = ensureMemberExists_(visitorName, joinTeamValue);
    memberAdded = memberAddResult.added;

    if (business) {
      addLockedClassification_(visitorName, memberAddResult.finalTeam || joinTeamValue, business);
    }
  }

  return {
    success: true,
    points,
    joinTeam: memberAddResult && memberAddResult.finalTeam ? memberAddResult.finalTeam : joinTeamValue,
    requestedJoinTeam,
    memberAdded,
    isLTInvite: isLT,
    crossTeamBonusAwarded,
    reassigned: teamAssignment ? teamAssignment.reassigned : false,
    reassignedReason: teamAssignment ? teamAssignment.reason : ''
  };
}

/* =========================
   SUBMIT ATTENDANCE
========================= */
function submitAttendance(attendanceData) {
  const ss              = SpreadsheetApp.getActiveSpreadsheet();
  const attendanceSheet = ss.getSheetByName('Attendance');
  const membersSheet    = ss.getSheetByName('Members');
  const activitiesSheet = ss.getSheetByName('Activities');
  const rules           = getRulesMap();

  const parts = attendanceData.date.split('-');
  const sel   = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
  if (sel.getDay() !== 2)
    return { success: false, message: 'Hanya hari Selasa. Dipilih: ' + attendanceData.date };

  const sessionKey    = attendanceData.session === 'Pagi' ? 'Morning_Attend' : 'Noon_Attend';
  const sessionPoints = rules[sessionKey] || 5;
  const memberRows    = membersSheet.getDataRange().getDisplayValues();
  memberRows.shift();

  attendanceData.members.forEach(memberName => {
    const m    = memberRows.find(r => r[0] === memberName);
    const team = m ? m[1] : '';
    const isLT = m ? (m[4]||'').toString().toUpperCase() === 'TRUE' : false;
    attendanceSheet.appendRow([attendanceData.date, attendanceData.session, memberName, team, true, isLT ? 0 : sessionPoints]);
    if (!isLT) activitiesSheet.appendRow([new Date(), memberName, team, '','', sessionKey, '', sessionPoints, 'Attendance '+attendanceData.session]);
  });

  const regRows = memberRows.filter(r => (r[4]||'').toString().toUpperCase() !== 'TRUE');
  const teams   = [...new Set(regRows.map(r=>r[1]).filter(Boolean))];
  teams.forEach(tn => {
    const tm = regRows.filter(r=>r[1]===tn && r[0]).map(r=>r[0]);
    if (tm.length > 0 && tm.every(n => attendanceData.members.includes(n))) {
      const bonus = rules['FullTeamBonus'] || 20;
      activitiesSheet.appendRow([new Date(),'TEAM BONUS',tn,'','','FullTeamBonus','',bonus,'Full team attended '+attendanceData.session]);
    }
  });

  return { success: true };
}

/* =========================
   ATTENDANCE HISTORY
========================= */
function getAttendanceDates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Attendance');
  const data = sheet.getDataRange().getDisplayValues();
  data.shift();

  const dates = [...new Set(
    data
      .filter(r => r[0])
      .map(r => r[0].toString())
  )];

  return dates.sort().reverse();
}

function getAttendanceByDate(date) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = Session.getScriptTimeZone();

  const attSheet = ss.getSheetByName('Attendance');
  const memSheet = ss.getSheetByName('Members');
  const actSheet = ss.getSheetByName('Activities');

  const attData = attSheet.getDataRange().getDisplayValues();
  const memData = memSheet.getDataRange().getDisplayValues();
  const actData = actSheet.getDataRange().getValues();

  attData.shift();
  memData.shift();
  actData.shift();

  const members = memData
    .filter(r => r[0] && (r[4] || '').toString().toUpperCase() !== 'TRUE')
    .map(r => ({
      memberName: r[0],
      team: r[1] || ''
    }));

  const presentNames = attData
    .filter(r => r[0] && r[0].toString() === date.toString())
    .map(r => r[2]);

  const inviteActions = ['Invite', 'Invite_Coffee'];

  const invitedNames = actData
    .filter(r => {
      const ts = r[0];
      const action = (r[5] || '').toString().trim();

      if (!ts || !inviteActions.includes(action)) return false;

      const actionDate = Utilities.formatDate(new Date(ts), tz, 'yyyy-MM-dd');
      return actionDate === date;
    })
    .map(r => (r[1] || '').toString().trim());

  const presentSet = new Set(presentNames);
  const invitedSet = new Set(invitedNames);

  const present = [];
  const absent = [];
  const noInvite = [];

  members.forEach(m => {
    if (presentSet.has(m.memberName)) {
      present.push(m);
    } else {
      absent.push(m);
    }

    if (!invitedSet.has(m.memberName)) {
      noInvite.push(m);
    }
  });

  return {
    date: date,
    summary: {
      present: present.length,
      absent: absent.length,
      noInvite: noInvite.length
    },
    lists: {
      present: present,
      absent: absent,
      noInvite: noInvite
    }
  };
}

/* =========================
   GET DASHBOARD DATA
========================= */
function getDashboardData() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const actData = ss.getSheetByName('Activities').getDataRange().getDisplayValues();
  actData.shift();
  const memData = ss.getSheetByName('Members').getDataRange().getDisplayValues();
  memData.shift();

  const memberList = memData
    .filter(r => r[0] && r[0].toString().trim() && (r[4]||'').toString().toUpperCase() !== 'TRUE')
    .map(r => ({ memberName: r[0].toString().trim(), team: r[1]||'' }));

  const statsMap = {};
  memberList.forEach(m => {
    statsMap[m.memberName] = {
      memberName: m.memberName, team: m.team,
      joinedVentura: 0, joinedOther: 0, totalPoints: 0, goldCount: 0,
      inviteCount: 0, attendanceCount: 0, coffeeCount: 0, appliedCount: 0,
      weeklyPoints: 0, weeklyInvites: 0, weeklyConversions: 0, weeklyCoffee: 0
    };
  });

  const now = new Date();

// Weekly reset: Senin jam 19:00
const weekStart = new Date(now);
const day = weekStart.getDay(); // 0=Sunday, 1=Monday, dst.

// Cari Senin terakhir
const daysSinceMonday = (day + 6) % 7;

weekStart.setDate(weekStart.getDate() - daysSinceMonday);
weekStart.setHours(23, 0, 0, 0);

// Kalau sekarang masih sebelum Senin jam 19:00,
// periode weekly masih dihitung dari Senin minggu lalu jam 19:00.
if (now < weekStart) {
  weekStart.setDate(weekStart.getDate() - 7);
}

  const feedActions = ['Invite','Invite_Coffee','Joined_Ventura','Joined_Other','Prior_Gold','Applied','Attended','Coffee_Session','Declined','Rejected','CrossTeamBonus','Brainstorm_3_Targets','Brain_Request'];
  const recentFeed  = [];

  actData.forEach(row => {
    const ts          = row[0];
    const name        = (row[1]||'').toString().trim();
    const teamCol     = (row[2]||'').toString().trim();
    const action      = (row[5]||'').toString().trim();
    const visitorName = (row[3]||'').toString().trim();
    const points      = Number(row[7]) || 0;
    const rowDate     = ts ? new Date(ts) : null;
    const isThisWeek  = rowDate && rowDate >= weekStart;

    if (name && name !== 'TEAM BONUS' && name !== 'LAUNCH_TEAM' && statsMap[name]) {
      const s = statsMap[name];
      // Prior_Gold: counts toward goldCount but ZERO points (fair start)
      if (action === 'Prior_Gold') {
        s.joinedOther++; // goldCount = JV + JO, so this adds 1/6
        // intentionally NOT adding to totalPoints
      } else {
        s.totalPoints += points;
        if (action === 'Joined_Ventura') { s.joinedVentura++; if(isThisWeek) s.weeklyConversions++; }
        if (action === 'Joined_Other')     s.joinedOther++;
        if (action === 'Invite' || action === 'Invite_Coffee') { s.inviteCount++; if(isThisWeek) s.weeklyInvites++; }
        if (action === 'Coffee_Session' || action === 'Invite_Coffee') { s.coffeeCount++; if(isThisWeek) s.weeklyCoffee++; }
        if (action === 'Applied')           s.appliedCount++;
        if (action === 'Morning_Attend' || action === 'Noon_Attend') s.attendanceCount++;
        if (isThisWeek) s.weeklyPoints += points;
      }
    }

    if (feedActions.includes(action)) {
  recentFeed.push({ ts: ts||'', name, action, visitorName, points, team: statsMap[name]?.team || teamCol });
}
  });

  Object.keys(statsMap).forEach(name => {
    const s = statsMap[name];
    s.goldCount    = s.joinedVentura + s.joinedOther;
    s.goldProgress = s.goldCount + ' / 6';
    s.convRate     = s.inviteCount > 0 ? ((s.joinedVentura/s.inviteCount)*100).toFixed(0)+'%' : '—';
  });

  const summaryRows = [
    ['MemberName','Team','Joined_Ventura','Joined_Other','TotalPoints','GoldProgress','GoldCount',
     'InviteCount','AttendanceCount','WeeklyPoints','WeeklyInvites','CoffeeCount','AppliedCount',
     'ConvRate','WeeklyConversions','WeeklyCoffee']
  ];
  Object.values(statsMap).forEach(s => {
    summaryRows.push([
      s.memberName, s.team, s.joinedVentura, s.joinedOther, s.totalPoints,
      s.goldProgress, s.goldCount, s.inviteCount, s.attendanceCount,
      s.weeklyPoints, s.weeklyInvites, s.coffeeCount, s.appliedCount,
      s.convRate, s.weeklyConversions, s.weeklyCoffee
    ]);
  });

  const allStats = Object.values(statsMap);

// Dynamic baseline: semua member aktif non-Launch Team di Members sheet
const foundingMemberCount = memberList.length;

// Count member yang join dari aktivitas Joined_Ventura
const newVentura = allStats.reduce((a,s)=>a+s.joinedVentura, 0);

const launchDate = new Date('2026-08-25');
const daysToLaunch = Math.max(0, Math.ceil((launchDate-now)/(1000*60*60*24)));

  const overallTop3 = allStats.slice()
    .sort((a,b)=>b.totalPoints-a.totalPoints||b.joinedVentura-a.joinedVentura)
    .slice(0,3)
    .map(s=>({ memberName:s.memberName, team:s.team, value:s.totalPoints, sub:s.joinedVentura+' JV · '+s.inviteCount+' inv' }));

  const weeklyTop3 = allStats.filter(s=>s.weeklyPoints>0)
    .sort((a,b)=>b.weeklyPoints-a.weeklyPoints||b.weeklyInvites-a.weeklyInvites)
    .slice(0,3)
    .map(s=>({ memberName:s.memberName, team:s.team, value:s.weeklyPoints, sub:s.weeklyInvites+' inv · '+s.weeklyConversions+' conv' }));

  /* ── Weekly growth data for chart ──
     Hitung Joined_Ventura per minggu (Senin–Minggu), build cumulative dari baseline 16.
     Gunakan tanggal Senin minggu itu sebagai key (YYYY-MM-DD) agar lebih reliable
     daripada ISO week number calculation yang bisa off-by-one.
  */
  const weeklyJoins = {}; // key: "YYYY-MM-DD" (tanggal Senin minggu itu)

  function getMondayKey(d) {
    const dow  = d.getDay(); // 0=Sun — renamed from 'day' to avoid duplicate declaration
    const diff = (dow === 0) ? -6 : 1 - dow;
    const mon  = new Date(d);
    mon.setDate(d.getDate() + diff);
    mon.setHours(0,0,0,0);
    return mon.getFullYear() + '-' +
      String(mon.getMonth()+1).padStart(2,'0') + '-' +
      String(mon.getDate()).padStart(2,'0');
  }

  const currentMemberSet = new Set(
  memberList.map(m => m.memberName.toString().trim().toLowerCase())
);

const countedJoinNames = new Set();

actData.forEach(row => {
  const ts = row[0];
  const name = (row[3] || '').toString().trim(); // visitorName / new member name
  const action = (row[5] || '').toString().trim();

  if (action !== 'Joined_Ventura' || !ts || !name) return;

  const keyName = name.toLowerCase();

  // hanya hitung kalau benar-benar ada di Members sheet
  if (!currentMemberSet.has(keyName)) return;

  // hindari duplicate Joined_Ventura untuk orang yang sama
  if (countedJoinNames.has(keyName)) return;
  countedJoinNames.add(keyName);

  const d = new Date(ts);
  if (isNaN(d)) return;

  const key = getMondayKey(d);
  weeklyJoins[key] = (weeklyJoins[key] || 0) + 1;
});

  // Sort weeks and build cumulative from dynamic founding member count
const sortedWeeks = Object.keys(weeklyJoins).sort(); // ISO date string sorts correctly
let cumulative = foundingMemberCount - newVentura;
const weeklyGrowth = [];

  sortedWeeks.forEach((wk, idx) => {
    cumulative += weeklyJoins[wk];
    // Human-readable label: "W1", "W2"... relative to first join week
    weeklyGrowth.push({ key: wk, value: cumulative, label: 'W'+(idx+1) });
  });

  // Always ensure the latest point represents current week, without using "Now" label
const currentTotal = foundingMemberCount;
const targetMembers = getDynamicTarget_(currentTotal);

const nextTarget =
  targetMembers === 51 ? 75 :
  targetMembers === 75 ? 100 :
  100;

const currentWeekKey = getMondayKey(now);

if (!weeklyGrowth.length) {
  // No joins yet — show current week as W0
  weeklyGrowth.push({ 
    key: currentWeekKey, 
    value: currentTotal, 
    label: 'W1' 
  });
} else if (weeklyGrowth[weeklyGrowth.length - 1].key !== currentWeekKey) {
  // Add current week point if latest activity week is not this week
  weeklyGrowth.push({ 
    key: currentWeekKey, 
    value: currentTotal, 
    label: 'W' + (weeklyGrowth.length + 1) 
  });
}

// Safety correction: graph terakhir harus selalu sama dengan total member aktual
if (weeklyGrowth.length) {
  weeklyGrowth[weeklyGrowth.length - 1].value = currentTotal;
}

  return {
    summary: summaryRows,
    chapterStats: {
      totalMembers: currentTotal,
      targetMembers: targetMembers,
      nextTarget: nextTarget,
      newVentura,
      newVenturaWeek: allStats.reduce((a,s)=>a+s.weeklyConversions, 0),
      weeklyInvitesTotal: allStats.reduce((a,s)=>a+s.weeklyInvites, 0),
      daysToLaunch
    },
    overallTop3,
    weeklyTop3,
    weeklyGrowth,
    recentFeed: recentFeed.slice(-20).reverse()
  };
}

/* =========================
   CLASSIFICATIONS

   Sheet: Classifications
   Columns:
   A = ID          (auto, timestamp-based)
   B = Type        (Locked | Wanted)
   C = Classification
   D = MemberName  (owner for Locked; searcher for Wanted)
   E = Team
   F = PostedDate
   G = CheckedBy   (who fulfilled a Wanted request)
   H = CheckedDate
   I = IsChecked   (TRUE/FALSE)
========================= */

function getClassificationsSheet_() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let sheet   = ss.getSheetByName('Classifications');
  if (!sheet) {
    sheet = ss.insertSheet('Classifications');
    sheet.appendRow(['ID','Type','Classification','MemberName','Team','PostedDate','CheckedBy','CheckedDate','IsChecked']);
  }
  return sheet;
}

/* Get all classifications */
function getClassifications() {
  const sheet = getClassificationsSheet_();
  const data  = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return { locked: [], wanted: [] };
  const rows  = data.slice(1).filter(r => r[0]);
  const locked = rows.filter(r => r[1] === 'Locked').map(r => ({
    id: r[0], classification: r[2], memberName: r[3], team: r[4], postedDate: r[5]
  }));
 const wanted = rows.filter(r => r[1] === 'Wanted').map(r => ({
  id: r[0],
  classification: r[2],
  memberName: r[3],
  team: r[4],
  postedDate: r[5],
  checkedBy: r[6],
  checkedDate: r[7],
  isChecked: r[8] === 'TRUE',
  source: r[9] || ''
}));
  return { locked, wanted };
}

/* Post a Wanted classification */
function postWantedClassification(data) {
  if (!data.memberName || !data.classification)
    return { success: false, message: 'Nama dan klasifikasi wajib diisi.' };

  const ss          = SpreadsheetApp.getActiveSpreadsheet();
  const membersSheet= ss.getSheetByName('Members');
  const memberRows  = membersSheet.getDataRange().getDisplayValues();
  memberRows.shift();
  const member = memberRows.find(r => r[0] === data.memberName);
  const team   = member ? member[1] : '';

  const sheet  = getClassificationsSheet_();
  const id     = 'W-' + new Date().getTime();
  sheet.appendRow([
  id,
  'Wanted',
  data.classification.trim(),
  data.memberName,
  team,
  new Date(),
  '',
  '',
  'FALSE',
  data.source || ''
]);
  return { success: true };
}

/* Fulfill a Wanted classification request.
   SIMPLIFIED: hanya mencoret/mark Wanted entry sebagai done + catat kapan.
   TIDAK ada hubungan dengan Locked Classification atau roster member.
   Locked Classification HANYA dari Launch Team via Update Status → Joined_Ventura.
*/
function fulfillWanted(data) {
  const sheet = getClassificationsSheet_();
  const rows  = sheet.getDataRange().getDisplayValues();
  const idx   = rows.findIndex(r => r[0] === data.id);
  if (idx === -1) return { success: false, message: 'Entry not found' };

  const rr = idx + 1;

  // Simply mark as fulfilled — that's all
  sheet.getRange(rr, 7).setValue(data.checkedBy || 'Fulfilled');
  sheet.getRange(rr, 8).setValue(new Date());
  sheet.getRange(rr, 9).setValue('TRUE');

  return { success: true };
}

/* Sync locked classifications from Members sheet
   Call this when new member joins to auto-create their Locked entry (optional) */
function syncLockedFromMembers(memberName, team, classification) {
  if (!classification) return;
  const sheet = getClassificationsSheet_();
  const id    = 'L-' + new Date().getTime();
  sheet.appendRow([id, 'Locked', classification, memberName, team, new Date(), '', '', 'FALSE']);
}

/* =========================
   GET MEMBER SPONSORS
   Baca dari Visitors — siapa yang sponsor (invite) setiap member yang Joined_Ventura.
   Tidak ada perubahan data, murni read-only dari Visitors sheet.
   Return: array { memberName, team, sponsoredBy, sponsoredByTeam, joinDate }
========================= */
function getMemberSponsors() {
  const ss              = SpreadsheetApp.getActiveSpreadsheet();
  const visitorsSheet   = ss.getSheetByName('Visitors');
  const membersSheet    = ss.getSheetByName('Members');

  const visitorData = visitorsSheet.getDataRange().getDisplayValues();
  visitorData.shift();

  const memberData = membersSheet.getDataRange().getDisplayValues();
  memberData.shift();

  // Build a set of current member names (non-LT)
  const memberSet = new Set(
    memberData
      .filter(r => r[0] && (r[4]||'').toString().toUpperCase() !== 'TRUE')
      .map(r => r[0].toString().trim())
  );

  // Filter Visitors to those who Joined_Ventura — these are the sponsored members
  const sponsors = visitorData
    .filter(r => r[0] && r[5] === 'Joined_Ventura')
    .map(r => ({
      memberName:      r[0] || '',   // the visitor who became a member
      team:            r[6] || r[4] || '',  // joinTeam (col G) or invitedByTeam
      sponsoredBy:     r[3] || '',   // invitedBy (col D)
      sponsoredByTeam: r[4] || '',   // invitedByTeam (col E)
      inviterType:     r[9] || 'Member',
      joinDate:        r[8] || r[7] || '' // lastUpdate or createdDate
    }))
    .filter(r => r.memberName);

  return sponsors;
}

/* =========================
   VERIFY PIN
========================= */
function verifyAdminPin(pin) {
  return pin === '3006';
}

/* =========================
   WHO TO INVITE / BRAIN JOLTER
   Shared idea pool + daily brainstorm reward
========================= */
function getBrainTargetsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('BrainTargets');
  if (!sh) {
    sh = ss.insertSheet('BrainTargets');
    sh.appendRow([
      'ID',
      'CreatedAt',
      'DateKey',
      'AddedBy',
      'TargetName',
      'Classification',
      'Category',
      'Requested',
      'RequestedBy',
      'RequestedAt'
    ]);
  }
  return sh;
}

function getDateKey_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function getTeamForMember_(memberName) {
  if (!memberName) return '';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Members');
  if (!sh) return '';
  const data = sh.getDataRange().getDisplayValues();
  data.shift();
  const m = data.find(r => (r[0] || '').toString().trim().toLowerCase() === memberName.toString().trim().toLowerCase());
  return m ? (m[1] || '') : '';
}

function getBrainTargets(data) {
  const memberName = (data && data.memberName || '').toString().trim().toLowerCase();

  const sh = getBrainTargetsSheet_();
  const rows = sh.getDataRange().getDisplayValues().slice(1).filter(r => r[0]);
  const today = getDateKey_();

  const targets = rows.map(r => ({
    id: r[0],
    createdAt: r[1],
    dateKey: r[2],
    addedBy: r[3],
    targetName: r[4],
    classification: r[5],
    category: r[6],
    requested: (r[7] || '').toString().toUpperCase() === 'TRUE',
    requestedBy: r[8],
    requestedAt: r[9]
  })).reverse().slice(0, 80);

  // ✅ COUNT PER MEMBER (INI FIX UTAMA)
  const todayCount = rows.filter(r =>
    r[2] === today &&
    (r[3] || '').toString().trim().toLowerCase() === memberName
  ).length;

  return {
    todayCount: Math.min(todayCount, 3),
    rewardUnlocked: todayCount >= 3,
    targets
  };
}

function addBrainTarget(data) {
  const addedBy = (data.addedBy || '').toString().trim();
  const targetName = (data.targetName || '').toString().trim();
  const classification = (data.classification || '').toString().trim();
  const category = (data.category || 'Other').toString().trim();

  if (!addedBy || !targetName || !classification) {
    return { success: false, message: 'Nama kamu, nama target, dan classification wajib diisi.' };
  }

  const sh = getBrainTargetsSheet_();
  const today = getDateKey_();
  const rows = sh.getDataRange().getDisplayValues().slice(1);

  // Prevent exact same target from the same member on the same day.
  const duplicate = rows.some(r =>
    r[2] === today &&
    (r[3] || '').toString().trim().toLowerCase() === addedBy.toLowerCase() &&
    (r[4] || '').toString().trim().toLowerCase() === targetName.toLowerCase() &&
    (r[5] || '').toString().trim().toLowerCase() === classification.toLowerCase()
  );
  if (duplicate) {
    return { success: false, message: 'Target yang sama sudah pernah kamu masukkan hari ini.' };
  }

  const beforeCount = rows.filter(r =>
    r[2] === today &&
    (r[3] || '').toString().trim().toLowerCase() === addedBy.toLowerCase()
  ).length;

  const id = 'BT-' + Date.now();
  sh.appendRow([
    id,
    new Date(),
    today,
    addedBy,
    targetName,
    classification,
    category,
    'FALSE',
    '',
    ''
  ]);

  const afterCount = beforeCount + 1;
  let rewardUnlocked = false;

  // Give +30 only once, exactly when the member reaches 3 targets today.
  if (afterCount === 3) {
    rewardUnlocked = true;
    logBrainActivity_(addedBy, 'Brainstorm_3_Targets', '', classification, 30, 'Daily Brainstorm Challenge: 3 targets added');
  }

  return {
    success: true,
    todayCount: Math.min(afterCount, 3),
    rewardUnlocked
  };
}

function requestBrainTarget(data) {
  const id = (data.id || '').toString().trim();
  const requestedBy = (data.requestedBy || '').toString().trim();
  const classification = (data.classification || '').toString().trim();

  if (!id || !requestedBy || !classification) {
    return { success: false, message: 'Data request belum lengkap.' };
  }

  const sh = getBrainTargetsSheet_();
  const values = sh.getDataRange().getDisplayValues();

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      if ((values[i][7] || '').toString().toUpperCase() === 'TRUE') {
        return { success: false, message: 'Target ini sudah pernah direquest.' };
      }

      sh.getRange(i + 1, 8).setValue('TRUE');
      sh.getRange(i + 1, 9).setValue(requestedBy);
      sh.getRange(i + 1, 10).setValue(new Date());

      // ✅ FIX: gunakan nama pebisnis (targetName), bukan requester
      postWantedClassification({
        memberName: values[i][4], // ini targetName dari BrainTargets
        classification: classification,
        source: 'brain'
      });

      // Optional light reward for creating demand signal.
      logBrainActivity_(
        requestedBy,
        'Brain_Request',
        classification,
        classification,
        5,
        'Requested target classification into Most Wanted'
      );

      return { success: true };
    }
  }

  return { success: false, message: 'Target tidak ditemukan.' };
}

function logBrainActivity_(memberName, action, visitorName, business, points, notes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName('Activities');
  if (!sh) return;

  const team = getTeamForMember_(memberName);
  sh.appendRow([
    new Date(),
    memberName,
    team,
    visitorName || '',
    business || '',
    action,
    '',
    Number(points) || 0,
    notes || ''
  ]);
}

function testDashboard() {
  try {
    const result = getDashboardData();
    Logger.log('daysToLaunch: ' + result.chapterStats.daysToLaunch);
    Logger.log('totalMembers: ' + result.chapterStats.totalMembers);
    Logger.log('weeklyGrowth length: ' + result.weeklyGrowth.length);
  } catch(e) {
    Logger.log('ERROR: ' + e.message);
    Logger.log('LINE: ' + e.stack);
  }
}
