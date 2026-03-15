let currentStep = 1;

// 숫자 포맷 (콤마)
function formatNumber(num) {
    return Math.round(num).toLocaleString('ko-KR');
}

// 입력값 숫자만 허용 + 콤마 포맷
document.querySelectorAll('input[inputmode="numeric"]').forEach(input => {
    input.addEventListener('input', function () {
        const raw = this.value.replace(/[^0-9]/g, '');
        this.value = raw;
    });
});

// 빠른 선택 버튼
document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.getElementById('desiredMonthly').value = this.dataset.value;
        document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
    });
});

function getVal(id) {
    return parseFloat(document.getElementById(id).value) || 0;
}

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
        if (getVal('desiredMonthly') <= 0) {
            showError('desiredMonthly', '희망 월 수령액을 입력해주세요');
            valid = false;
        }
    } else if (step === 2) {
        if (getVal('currentAge') <= 0 || getVal('currentAge') > 80) {
            showError('currentAge', '올바른 나이를 입력해주세요');
            valid = false;
        }
        if (getVal('annualSalary') <= 0) {
            showError('annualSalary', '연봉을 입력해주세요');
            valid = false;
        }
        if (getVal('yearsWorked') <= 0) {
            showError('yearsWorked', '근무 년수를 입력해주세요');
            valid = false;
        }
        if (getVal('retirementAge') <= getVal('currentAge')) {
            showError('retirementAge', '현재 나이보다 커야 합니다');
            valid = false;
        }
        if (getVal('pensionReceiveAge') < getVal('retirementAge')) {
            showError('pensionReceiveAge', '퇴직 나이 이상이어야 합니다');
            valid = false;
        }
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

function calculate() {
    const desiredMonthly = getVal('desiredMonthly'); // 만원
    const currentAge = getVal('currentAge');
    const annualSalary = getVal('annualSalary'); // 만원
    const yearsWorked = getVal('yearsWorked');
    const retirementAge = getVal('retirementAge');
    const pensionReceiveAge = getVal('pensionReceiveAge');

    const monthlySalary = annualSalary / 12;
    const yearsUntilRetirement = retirementAge - currentAge;
    const totalWorkYears = yearsWorked + yearsUntilRetirement;
    const pensionReceiveYears = 25; // 연금 수령 기간 가정 (65세~90세)

    // ── 국민연금 계산 (간이 공식) ──
    // 2024년 기준 A값(전체 가입자 평균소득월액) ≈ 약 280만원
    const avgA = 280;
    // B값 = 본인 평균 소득월액 (상한 590만원)
    const cappedMonthly = Math.min(monthlySalary, 590);
    // 국민연금 가입기간 (18세~60세 사이 근무기간)
    const pensionStartAge = Math.max(18, currentAge - yearsWorked);
    const nationalPensionYears = Math.min(60, retirementAge) - pensionStartAge;

    // 기본연금액 = (A + B) × P × (가입년수/20)
    // P값: 20년 가입 기준 1.2, 대략 가입년수에 비례
    // 간이: 월 수령액 ≈ (A + B) × 가입년수 × 0.015 (대략적 계수)
    let nationalPensionMonthly = 0;
    if (nationalPensionYears > 0) {
        nationalPensionMonthly = (avgA + cappedMonthly) * Math.min(nationalPensionYears, 40) * 0.015;
    }
    nationalPensionMonthly = Math.max(0, Math.round(nationalPensionMonthly * 10) / 10);

    // ── 퇴직연금 계산 ──
    // 퇴직금 = 최종월급 × 총 근속년수
    const retirementLumpSum = monthlySalary * totalWorkYears;
    // 퇴직연금으로 전환 시 월 수령액 (수령기간으로 나눔)
    const retirementPensionMonthly = retirementLumpSum / (pensionReceiveYears * 12);

    // ── 부족분 ──
    const companyTotal = nationalPensionMonthly + retirementPensionMonthly;
    const gap = Math.max(0, desiredMonthly - companyTotal);

    // ── 결과 표시 ──
    document.getElementById('resultDesired').textContent = `${formatNumber(desiredMonthly)}만원`;
    document.getElementById('resultNational').textContent = `약 ${formatNumber(nationalPensionMonthly)}만원`;
    document.getElementById('resultRetirement').textContent = `약 ${formatNumber(retirementPensionMonthly)}만원`;
    document.getElementById('resultCompanyTotal').textContent = `약 ${formatNumber(companyTotal)}만원`;
    document.getElementById('resultGap').textContent = gap > 0 ? `${formatNumber(gap)}만원` : '부족분 없음!';

    // ── 개인연금 월 납입액 계산 ──
    // 은퇴 시점까지 적립 → 연금 수령 기간 동안 gap만큼 인출
    // 필요한 총 자금 = gap × 12 × pensionReceiveYears (만원)
    const totalNeeded = gap * 12 * pensionReceiveYears;
    const monthsToRetirement = yearsUntilRetirement * 12;

    const rates = [3, 5, 7, 10];
    rates.forEach(rate => {
        const monthlyRate = rate / 100 / 12;
        let monthlyPayment;
        if (monthlyRate === 0) {
            monthlyPayment = totalNeeded / monthsToRetirement;
        } else {
            // FV of annuity: FV = PMT × ((1+r)^n - 1) / r
            // PMT = FV × r / ((1+r)^n - 1)
            const factor = Math.pow(1 + monthlyRate, monthsToRetirement) - 1;
            monthlyPayment = totalNeeded * monthlyRate / factor;
        }

        const totalPaid = monthlyPayment * monthsToRetirement;
        const el = document.getElementById('rate' + rate);
        el.innerHTML = `
            <span>${rate}%</span>
            <span>${formatNumber(monthlyPayment)}만원</span>
            <span>${formatNumber(totalPaid)}만원</span>
        `;
    });

    // ── 가정 목록 ──
    const assumptions = [
        `정년 퇴직 나이: ${retirementAge}세, 연금 수령 시작: ${pensionReceiveAge}세`,
        `연금 수령 기간: ${pensionReceiveYears}년 (${pensionReceiveAge}세 ~ ${pensionReceiveAge + pensionReceiveYears}세)`,
        `국민연금: 전체 가입자 평균소득월액 280만원 기준, 가입기간 ${Math.round(nationalPensionYears)}년`,
        `퇴직연금: 현재 월급 기준 총 ${Math.round(totalWorkYears)}년 근속 가정`,
        `물가 상승률 미반영 (현재 가치 기준)`,
        `개인연금 수익률은 세전 기준`,
    ];
    const ul = document.getElementById('assumptionsList');
    ul.innerHTML = assumptions.map(a => `<li>${a}</li>`).join('');
}
