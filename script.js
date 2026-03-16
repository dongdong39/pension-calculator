let currentStep = 1;
let dbdcType = 'db';
let receiveType = 'both';

// ═══════ UI Controls ═══════

function setDBDC(btn) {
    dbdcType = btn.dataset.value;
    document.querySelectorAll('#dbdcSegment .segment-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('dbdcBg').style.transform = `translateX(${btn.dataset.index * 100}%)`;

    // 설명 카드 전환
    document.getElementById('explainDB').classList.toggle('active', dbdcType === 'db');
    document.getElementById('explainDC').classList.toggle('active', dbdcType === 'dc');

    // DC 전용 필드
    document.getElementById('returnRateGroup').classList.toggle('show', dbdcType === 'dc');
}

function setReceiveType(btn) {
    receiveType = btn.dataset.value;
    document.querySelectorAll('#receiveSegment .segment-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('receiveBg').style.transform = `translateX(${btn.dataset.index * 100}%)`;
}

// 숫자 입력 제한
document.querySelectorAll('input[inputmode="numeric"]').forEach(input => {
    input.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
});

// 빠른 선택 버튼
document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        const target = document.getElementById(this.dataset.target);
        target.value = this.dataset.value;
        // 같은 그룹 선택 해제
        this.closest('.quick-select').querySelectorAll('.quick-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
    });
});

function getVal(id) { return parseFloat(document.getElementById(id).value) || 0; }

function showError(id, msg) {
    const wrapper = document.getElementById(id).closest('.input-wrapper');
    wrapper.classList.add('error');
    const existing = wrapper.parentElement.querySelector('.error-msg');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'error-msg';
    el.textContent = msg;
    wrapper.parentElement.appendChild(el);
}

function clearErrors() {
    document.querySelectorAll('.input-wrapper.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.error-msg').forEach(el => el.remove());
}

function validateStep(step) {
    clearErrors();
    let valid = true;
    if (step === 1) {
        if (getVal('desiredMonthly') <= 0) { showError('desiredMonthly', '희망 월 수령액을 입력해주세요'); valid = false; }
    } else if (step === 2) {
        if (getVal('currentAge') <= 0 || getVal('currentAge') > 80) { showError('currentAge', '올바른 나이를 입력해주세요'); valid = false; }
        if (getVal('annualSalary') <= 0) { showError('annualSalary', '연봉을 입력해주세요'); valid = false; }
        if (getVal('yearsWorked') <= 0) { showError('yearsWorked', '근무 년수를 입력해주세요'); valid = false; }
        if (getVal('retirementAge') <= getVal('currentAge')) { showError('retirementAge', '현재 나이보다 커야 합니다'); valid = false; }
        if (getVal('pensionReceiveAge') < getVal('retirementAge')) { showError('pensionReceiveAge', '퇴직 나이 이상이어야 합니다'); valid = false; }
        if (getVal('wageGrowth') <= 0) { showError('wageGrowth', '임금인상률을 입력해주세요'); valid = false; }
        if (dbdcType === 'dc' && getVal('returnRate') <= 0) { showError('returnRate', '운용수익률을 입력해주세요'); valid = false; }
    }
    return valid;
}

function updateProgress(step) {
    document.querySelectorAll('.progress-step').forEach((el, i) => {
        el.classList.remove('active', 'completed');
        if (i + 1 < step) el.classList.add('completed');
        if (i + 1 === step) el.classList.add('active');
    });
    document.querySelectorAll('.progress-line').forEach((el, i) => {
        el.classList.toggle('active', i + 1 < step);
    });
}

function nextStep(from) {
    if (!validateStep(from)) return;
    currentStep = from + 1;
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.getElementById('step' + currentStep).classList.add('active');
    updateProgress(currentStep);
    if (currentStep === 3) calculate();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep(from) {
    clearErrors();
    currentStep = from - 1;
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.getElementById('step' + currentStep).classList.add('active');
    updateProgress(currentStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleTaxDetail() {
    const content = document.getElementById('taxDetail');
    const arrow = document.getElementById('taxArrow');
    content.classList.toggle('open');
    arrow.classList.toggle('open');
}

function fmt(num) {
    const n = Math.round(num);
    const abs = Math.abs(n);
    if (abs >= 10000) {
        const eok = Math.floor(abs / 10000);
        const rest = abs % 10000;
        const sign = n < 0 ? '-' : '';
        if (rest === 0) return `${sign}${eok.toLocaleString('ko-KR')}억`;
        return `${sign}${eok.toLocaleString('ko-KR')}억 ${rest.toLocaleString('ko-KR')}`;
    }
    return n.toLocaleString('ko-KR');
}
function fmtWon(num) { return Math.round(num).toLocaleString('ko-KR'); }

// ═══════ Calculations ═══════

function calcNationalPension(monthlySalaryMan, pensionYears) {
    const avgA = 280; // 전체 가입자 평균소득월액 (만원)
    const capped = Math.min(monthlySalaryMan, 590); // 상한
    const years = Math.min(Math.max(pensionYears, 0), 40);
    return years > 0 ? (avgA + capped) * years * 0.005 : 0;
}

function calcDB(monthlySalaryMan, totalWorkYears, yearsUntilRetirement, wageGrowthRate) {
    // DB: 퇴직 시 최종 월급 × 총 근속년수
    const finalMonthly = monthlySalaryMan * Math.pow(1 + wageGrowthRate, yearsUntilRetirement);
    return finalMonthly * totalWorkYears;
}

function calcDC(annualSalaryMan, yearsWorked, yearsUntilRetirement, wageGrowthRate, returnRate) {
    // DC: 매년 연봉/12 적립, 운용수익률로 복리 성장
    const totalYears = yearsWorked + yearsUntilRetirement;
    const startSalary = annualSalaryMan / Math.pow(1 + wageGrowthRate, yearsWorked);
    let balance = 0;
    for (let y = 0; y < totalYears; y++) {
        const salary = startSalary * Math.pow(1 + wageGrowthRate, y);
        const contribution = salary / 12;
        const compoundYears = totalYears - y - 1;
        balance += contribution * Math.pow(1 + returnRate, compoundYears);
    }
    return balance;
}

function calcRetirementTax(lumpSumWon, serviceYears) {
    // 1. 근속공제
    let deduction;
    if (serviceYears <= 5) deduction = 1000000 * serviceYears;
    else if (serviceYears <= 10) deduction = 5000000 + 2000000 * (serviceYears - 5);
    else if (serviceYears <= 20) deduction = 15000000 + 2500000 * (serviceYears - 10);
    else deduction = 40000000 + 3000000 * (serviceYears - 20);

    // 2. 과세표준
    const taxableIncome = Math.max(0, lumpSumWon - deduction);

    // 3. 연평균
    const annualAvg = serviceYears > 0 ? taxableIncome / serviceYears : 0;

    // 4. 환산 (×12)
    const converted = annualAvg * 12;

    // 5. 차등공제
    let diffDeduction = 0;
    if (converted <= 8000000) {
        diffDeduction = converted;
    } else if (converted <= 70000000) {
        diffDeduction = 8000000 + (converted - 8000000) * 0.6;
    } else if (converted <= 100000000) {
        diffDeduction = 8000000 + 62000000 * 0.6 + (converted - 70000000) * 0.55;
    } else if (converted <= 300000000) {
        diffDeduction = 8000000 + 62000000 * 0.6 + 30000000 * 0.55 + (converted - 100000000) * 0.45;
    } else {
        diffDeduction = 8000000 + 62000000 * 0.6 + 30000000 * 0.55 + 200000000 * 0.45 + (converted - 300000000) * 0.35;
    }

    // 6. 환산과세표준
    const finalBase = Math.max(0, converted - diffDeduction);

    // 7. 세율
    let calcTax;
    if (finalBase <= 14000000) calcTax = finalBase * 0.06;
    else if (finalBase <= 50000000) calcTax = 840000 + (finalBase - 14000000) * 0.15;
    else if (finalBase <= 88000000) calcTax = 6240000 + (finalBase - 50000000) * 0.24;
    else if (finalBase <= 150000000) calcTax = 15360000 + (finalBase - 88000000) * 0.35;
    else if (finalBase <= 300000000) calcTax = 37060000 + (finalBase - 150000000) * 0.38;
    else if (finalBase <= 500000000) calcTax = 94060000 + (finalBase - 300000000) * 0.4;
    else if (finalBase <= 1000000000) calcTax = 174060000 + (finalBase - 500000000) * 0.42;
    else calcTax = 384060000 + (finalBase - 1000000000) * 0.45;

    // 8. 역환산
    const incomeTax = serviceYears > 0 ? calcTax / 12 * serviceYears : 0;
    const localTax = incomeTax * 0.1;
    const totalTax = incomeTax + localTax;

    return { deduction, taxableIncome, annualAvg, converted, diffDeduction, finalBase, calcTax, incomeTax, localTax, totalTax, effectiveRate: lumpSumWon > 0 ? totalTax / lumpSumWon : 0 };
}

function calcPersonalPension(gap, pensionReceiveYears, yearsUntilRetirement, rates, prefix) {
    const totalNeeded = gap * 12 * pensionReceiveYears; // 만원
    const months = yearsUntilRetirement * 12;
    const years = yearsUntilRetirement;
    rates.forEach(rate => {
        const mr = rate / 100 / 12;
        let monthly;
        if (mr === 0 || months === 0) {
            monthly = months > 0 ? totalNeeded / months : totalNeeded;
        } else {
            monthly = totalNeeded * mr / (Math.pow(1 + mr, months) - 1);
        }
        const total = monthly * months;
        const monthlyRound = Math.round(monthly);
        const compoundUrl = `https://dongdong39.github.io/compound-calculator/?mode=monthly&monthly=${monthlyRound}&rate=${rate}&years=${years}`;
        document.getElementById(prefix + rate).innerHTML =
            `<span>${rate}%</span><span>${fmt(monthly)}만원</span><span><a href="${compoundUrl}" target="_blank" class="rate-link">${fmt(total)}만원 →</a></span>`;
    });
}

// ═══════ Main Calculate ═══════

function calculate() {
    const desiredMonthly = getVal('desiredMonthly');
    const currentAge = getVal('currentAge');
    const annualSalary = getVal('annualSalary');
    const yearsWorked = getVal('yearsWorked');
    const retirementAge = getVal('retirementAge');
    const pensionReceiveAge = getVal('pensionReceiveAge');
    const wageGrowth = getVal('wageGrowth') / 100;
    const returnRate = getVal('returnRate') / 100 || 0.05;

    const monthlySalary = annualSalary / 12;
    const yearsUntilRetirement = retirementAge - currentAge;
    const totalWorkYears = yearsWorked + yearsUntilRetirement;
    const pensionReceiveYears = 25; // 65세~90세

    // 국민연금
    const pensionStartAge = Math.max(18, currentAge - yearsWorked);
    const nationalPensionYears = Math.min(60, retirementAge) - pensionStartAge;
    const nationalMonthly = Math.max(0, Math.round(calcNationalPension(monthlySalary, nationalPensionYears) * 10) / 10);

    // 퇴직연금 (DB or DC)
    let retirementGrossMan;
    if (dbdcType === 'db') {
        retirementGrossMan = calcDB(monthlySalary, totalWorkYears, yearsUntilRetirement, wageGrowth);
    } else {
        retirementGrossMan = calcDC(annualSalary, yearsWorked, yearsUntilRetirement, wageGrowth, returnRate);
    }

    // 세금 계산 (원 단위)
    const retirementGrossWon = retirementGrossMan * 10000;
    const tax = calcRetirementTax(retirementGrossWon, Math.round(totalWorkYears));
    const retirementNetMan = retirementGrossMan - tax.totalTax / 10000;

    // ── 결과 표시 ──
    document.getElementById('resultDesired').textContent = `${fmt(desiredMonthly)}만원`;
    document.getElementById('resultDBDCType').textContent = dbdcType === 'db' ? 'DB 확정급여' : 'DC 확정기여';
    document.getElementById('resultNationalYears').textContent = `${Math.round(nationalPensionYears)}년`;
    document.getElementById('resultNational').textContent = `약 ${fmt(nationalMonthly)}만원`;

    document.getElementById('resultRetirementGross').textContent = `약 ${fmt(retirementGrossMan)}만원`;
    document.getElementById('resultTax').textContent = `-${fmtWon(Math.round(tax.totalTax / 10000))}만원`;
    document.getElementById('resultTaxRate').textContent = `${(tax.effectiveRate * 100).toFixed(1)}%`;
    document.getElementById('resultRetirementNet').textContent = `약 ${fmt(retirementNetMan)}만원`;

    // 세금 상세
    document.getElementById('detailDeduction').textContent = `${fmtWon(tax.deduction)}원`;
    document.getElementById('detailTaxBase').textContent = `${fmtWon(tax.taxableIncome)}원`;
    document.getElementById('detailAnnualAvg').textContent = `${fmtWon(Math.round(tax.annualAvg))}원`;
    document.getElementById('detailConverted').textContent = `${fmtWon(Math.round(tax.converted))}원`;
    document.getElementById('detailDiffDeduction').textContent = `${fmtWon(Math.round(tax.diffDeduction))}원`;
    document.getElementById('detailFinalBase').textContent = `${fmtWon(Math.round(tax.finalBase))}원`;
    document.getElementById('detailCalcTax').textContent = `${fmtWon(Math.round(tax.calcTax))}원`;
    document.getElementById('detailIncomeTax').textContent = `${fmtWon(Math.round(tax.incomeTax))}원`;
    document.getElementById('detailLocalTax').textContent = `${fmtWon(Math.round(tax.localTax))}원`;

    // 케이스 A: 연금 수령 (세금 30% 감면)
    const annuityTaxDiscount = 0.3;
    const retirementNetAnnuityMan = retirementGrossMan - (tax.totalTax / 10000) * (1 - annuityTaxDiscount);
    const annuityMonthly = retirementNetAnnuityMan / (pensionReceiveYears * 12);
    const totalA = nationalMonthly + annuityMonthly;
    const gapA = Math.max(0, desiredMonthly - totalA);
    const taxSaved = (tax.totalTax / 10000) * annuityTaxDiscount;

    document.getElementById('resultAnnuityMonthly').textContent = `약 ${fmt(annuityMonthly)}만원`;
    document.getElementById('resultAnnuityTaxSave').textContent = `약 ${fmt(taxSaved)}만원 절세`;
    document.getElementById('resultTotalA').textContent = `약 ${fmt(totalA)}만원`;
    document.getElementById('resultGapA').textContent = gapA > 0 ? `${fmt(gapA)}만원` : '부족분 없음!';

    // 케이스 B: 일시금 수령
    const totalB = nationalMonthly;
    const gapB = Math.max(0, desiredMonthly - totalB);

    document.getElementById('resultLumpNet').textContent = `약 ${fmt(retirementNetMan)}만원 (세후)`;
    document.getElementById('resultTotalB').textContent = `약 ${fmt(totalB)}만원`;
    document.getElementById('resultGapB').textContent = gapB > 0 ? `${fmt(gapB)}만원` : '부족분 없음!';

    // 케이스 표시
    document.getElementById('caseAnnuity').style.display = (receiveType === 'both' || receiveType === 'annuity') ? 'block' : 'none';
    document.getElementById('caseLumpsum').style.display = (receiveType === 'both' || receiveType === 'lumpsum') ? 'block' : 'none';

    // 개인연금 납입액
    const rates = [3, 5, 7, 10];
    calcPersonalPension(gapA, pensionReceiveYears, yearsUntilRetirement, rates, 'rateA');
    calcPersonalPension(gapB, pensionReceiveYears, yearsUntilRetirement, rates, 'rateB');

    // 가정 목록
    const assumptions = [
        `정년 ${retirementAge}세, 연금 수령 ${pensionReceiveAge}~${pensionReceiveAge + pensionReceiveYears}세 (${pensionReceiveYears}년간)`,
        `임금인상률 연 ${(wageGrowth * 100).toFixed(0)}% 가정`,
        dbdcType === 'dc' ? `DC 운용수익률 연 ${(returnRate * 100).toFixed(0)}% 가정` : `DB: 퇴직 시 최종월급 × 총 근속년수(${Math.round(totalWorkYears)}년)`,
        `국민연금: 가입자 평균소득월액 280만원 기준, 가입기간 ${Math.round(nationalPensionYears)}년`,
        `퇴직소득세: 2024년 기준 근속공제·차등공제·세율 적용`,
        `연금 수령 시 퇴직소득세 30% 감면 적용`,
        `물가 상승률 미반영 (현재 가치 기준)`,
    ];
    document.getElementById('assumptionsList').innerHTML = assumptions.map(a => `<li>${a}</li>`).join('');
}
