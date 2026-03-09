import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import * as cheerio from "cheerio";
import { Server } from "socket.io";
import { createServer } from "http";
import multer from "multer";
import fs from "fs";

const db = new Database("zen4u.db");

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT,
    department TEXT,
    name TEXT,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS memos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_url TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_favorite INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    category TEXT,
    title TEXT,
    content TEXT,
    link_url TEXT,
    link_title TEXT,
    link_description TEXT,
    link_image TEXT,
    file_url TEXT,
    file_name TEXT,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT,
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  -- Insert sample reporters into users table if they don't exist
  INSERT OR IGNORE INTO users (id, name, company, department, email) VALUES 
  (991, '김기자', '동아일보', '산업부', 'kim@donga.com'),
  (992, '이리포터', 'KBS', '정치부', 'lee@kbs.co.kr'),
  (993, '박기자', '매일경제', '금융부', 'park@mk.co.kr'),
  (994, '최기자', '한겨레', '사회부', 'choi@hani.co.kr'),
  (995, '정리포터', 'SBS', 'IT부', 'jung@sbs.co.kr');
`);

// Sample Reporter Data
const reporters = [
  {
    id: "reporter_1",
    db_user_id: 991,
    name: "김기자",
    newsAgency: "동아일보",
    specialty: ["반도체", "배터리", "전자"],
    articles: [
      { 
        id: "art_1", 
        title: "2nm 공정 양산 돌입... 삼성-TSMC '초미세 공정' 무한 경쟁", 
        date: "2026-03-05", 
        content: `반도체 업계의 '꿈의 공정'이라 불리는 2나노미터(nm) 공정 양산이 본격화되면서 삼성전자와 TSMC 간의 기술 패권 경쟁이 정점으로 치닫고 있습니다. 오늘(5일) 업계에 따르면, 삼성전자는 세계 최초로 GAA(Gate-All-Around) 기술을 적용한 2나노 2세대 공정 수율을 안정화하며 글로벌 빅테크 기업들로부터 대규모 수주를 확보하는 데 성공했습니다.

이번 2나노 공정은 기존 3나노 대비 전력 효율은 30% 이상 개선되었으며, 성능은 15% 향상되었습니다. 특히 AI 가속기와 고성능 컴퓨팅(HPC) 시장에서 저전력 고성능 반도체에 대한 수요가 폭증하면서, 2나노 공정은 향후 10년 반도체 시장의 향방을 가를 핵심 승부처로 꼽힙니다. TSMC 역시 대만 신주 과학단지에 건설 중인 2나노 전용 라인을 가동하며 맞불을 놨습니다. TSMC는 기존 핀펫(FinFET) 구조의 한계를 극복하기 위해 나노시트(Nanosheet) 기술을 도입하며 삼성과의 기술 격차를 좁히는 데 주력하고 있습니다.

전문가들은 이번 경쟁이 단순히 누가 먼저 양산하느냐를 넘어, 누가 더 안정적인 수율을 확보하고 고객사별 맞춤형 솔루션을 제공하느냐의 싸움이 될 것으로 보고 있습니다. 특히 엔비디아, 애플, 구글 등 자체 칩 설계를 강화하고 있는 빅테크 기업들이 어떤 파운드리 파트너를 선택하느냐에 따라 시장 판도가 크게 요동칠 전망입니다. 삼성전자는 패키징 기술인 'I-Cube'와 'X-Cube'를 결합한 턴키(Turn-key) 솔루션을 앞세워 고객사 확보에 총력을 기울이고 있습니다.

배터리 분야에서도 혁신이 이어지고 있습니다. 꿈의 배터리로 불리는 '전고체 배터리'의 상용화가 임박했다는 소식입니다. 삼성SDI는 파일럿 라인 가동을 통해 확보한 데이터를 바탕으로, 에너지 밀도를 획기적으로 높인 전고체 배터리 양산 준비를 마쳤습니다. 전고체 배터리는 화재 위험이 거의 없고 주행 거리를 획기적으로 늘릴 수 있어 전기차 시장의 '게임 체인저'로 불립니다.

글로벌 완성차 업체들은 이미 삼성SDI의 전고체 배터리를 탑재한 시제차 테스트에 돌입했습니다. 업계 관계자는 "2026년 하반기부터는 전고체 배터리가 탑재된 프리미엄 전기차 모델이 시장에 본격적으로 출시될 것"이라며 "이는 전기차 대중화를 앞당기는 결정적인 계기가 될 것"이라고 전망했습니다. 한국 반도체와 배터리 산업이 2나노와 전고체라는 양대 축을 바탕으로 글로벌 시장에서의 리더십을 더욱 공고히 할 수 있을지 전 세계의 이목이 집중되고 있습니다.

이러한 기술적 진보는 국가 안보와도 직결됩니다. 반도체와 배터리는 단순한 산업 자산을 넘어 국가의 전략 자산으로 인식되고 있으며, 각국 정부는 자국 내 생산 시설 유치를 위해 파격적인 보조금과 세제 혜택을 제공하고 있습니다. 우리 정부 또한 'K-반도체 전략'과 'K-배터리 전략'을 강화하며 민간 투자를 적극 지원하고 있습니다. 기술 패권 경쟁이 심화되는 가운데, 기업들의 혁신 노력과 정부의 전략적 지원이 시너지를 발휘해야 할 시점입니다.`,
        image: "https://picsum.photos/seed/semiconductor2026/1200/800"
      }
    ]
  },
  {
    id: "reporter_2",
    db_user_id: 992,
    name: "이리포터",
    newsAgency: "KBS",
    specialty: ["정치", "외교", "안보"],
    articles: [
      { 
        id: "art_2", 
        title: "2026 글로벌 안보 지형 재편... '우주 영토' 분쟁 본격화", 
        date: "2026-03-05", 
        content: `2026년 국제 정세는 기존의 지상 중심 안보 동맹을 넘어 우주 공간을 둘러싼 패권 다툼으로 그 영역이 확장되고 있습니다. 오늘(5일) 한미일 3국 외교장관은 화상 회담을 갖고, 최근 심화되고 있는 달 자원 탐사 및 위성 궤도 점유를 둘러싼 갈등에 공동 대응하기로 합의했습니다.

이번 합의의 핵심은 '우주 안보 협력 체계' 구축입니다. 각국은 달 남극 등 자원이 풍부한 지역에 대한 탐사 권한을 두고 갈등이 격화되자, 이를 평화적으로 관리하기 위한 국제 규범 마련에 앞장서기로 했습니다. 특히 특정 국가의 독점적 점유를 방지하고, 우주 쓰레기 문제 해결을 위한 공동 기술 개발에도 협력하기로 했습니다. 이는 우주 공간이 더 이상 과학 탐사의 영역이 아닌, 국가 생존과 직결된 전략적 요충지가 되었음을 의미합니다.

지상에서의 안보 상황도 긴박하게 돌아가고 있습니다. 동유럽과 중동 지역의 분쟁이 장기화되면서 글로벌 공급망은 여전히 불안정한 상태입니다. 이에 각국은 군사적 동맹을 넘어 경제와 기술을 결합한 '포괄적 안보 동맹'을 강화하고 있습니다. 특히 핵심 광물과 에너지 자원을 확보하기 위한 자원 외교가 치열하게 전개되고 있으며, 이는 새로운 형태의 블록 경제 형성을 가속화하고 있습니다.

우리 정부는 이러한 변화에 발맞춰 '실용 외교'와 '가치 외교'의 균형을 맞추는 데 주력하고 있습니다. 한미 동맹을 기반으로 하되, 신흥 경제권 국가들과의 협력을 확대하여 외교적 지평을 넓히겠다는 구상입니다. 특히 동남아시아와 아프리카 지역 국가들과의 자원 협력 파트너십을 강화하며 공급망 다변화를 꾀하고 있습니다.

안보 전문가들은 "2026년은 냉전 이후 가장 복잡하고 다층적인 안보 위기에 직면한 해"라고 진단합니다. 사이버 테러, 기후 위기, 인구 절벽 등 비전통적 안보 위협이 증대되면서 국가 안보의 개념 자체가 재정의되고 있다는 분석입니다. 이에 대응하기 위해 군사력뿐만 아니라 경제력, 기술력, 문화적 영향력을 총동원하는 '통합 안보' 전략이 필요하다는 목소리가 높습니다.

특히 AI 기술의 군사적 도입을 둘러싼 논란도 뜨겁습니다. 자율 살상 무기 체계(LAWS)의 윤리적 가이드라인 마련을 위한 국제 회의가 제네바에서 열리고 있지만, 각국의 이해관계가 엇갈리며 합의 도달에 어려움을 겪고 있습니다. 우리나라는 AI 강국으로서 기술적 우위를 바탕으로 국제 사회의 논의를 주도하며, 평화적 이용을 위한 합리적인 규범 마련에 기여하고 있습니다.

결국 2026년의 외교 안보는 '예측 불가능성'과의 싸움입니다. 급변하는 정세 속에서 국익을 극대화하기 위해서는 유연하면서도 원칙 있는 외교 전략이 필수적입니다. 우주라는 새로운 영토와 AI라는 새로운 기술이 가져올 도전 과제들을 어떻게 지혜롭게 풀어가느냐에 따라 대한민국의 미래 위상이 결정될 것입니다. 글로벌 중추 국가로서의 역할을 다하기 위한 우리 외교의 행보에 전 세계의 시선이 집중되고 있습니다.`,
        image: "https://picsum.photos/seed/space2026/1200/800"
      }
    ]
  },
  {
    id: "reporter_3",
    db_user_id: 993,
    name: "박기자",
    newsAgency: "매일경제",
    specialty: ["금융", "증시", "부동산"],
    articles: [
      { 
        id: "art_3", 
        title: "디지털 화폐(CBDC) 시대 개막... 금융 생태계의 대전환", 
        date: "2026-03-05", 
        content: `한국은행이 중앙은행 디지털 화폐(CBDC)의 본격적인 시범 운영을 시작하면서 대한민국 금융 시장이 역사적인 전환점을 맞이했습니다. 오늘(5일)부터 주요 시중 은행과 협력하여 일반 시민들을 대상으로 한 실생활 결제 테스트가 진행됩니다. 이는 현금 없는 사회를 넘어, 프로그래밍 가능한 화폐가 가져올 금융 혁신의 서막으로 평가받습니다.

CBDC는 기존 전자 결제 수단과 달리 중앙은행이 직접 발행하고 가치를 보장하므로 신뢰도가 높고 결제 완결성이 보장됩니다. 특히 스마트 계약 기술을 결합하여 특정 조건이 충족될 때만 대금이 지급되도록 설정할 수 있어, 부동산 거래나 복지 예산 집행 등 다양한 분야에서 투명성과 효율성을 획기적으로 높일 수 있습니다. 예를 들어, 아동 급식 카드의 경우 지정된 품목 구매 시에만 결제가 이루어지도록 자동화할 수 있습니다.

증시 또한 CBDC 도입 소식에 민감하게 반응하고 있습니다. 핀테크와 보안 관련주들이 강세를 보이는 가운데, 전통적인 은행권은 디지털 전환 속도를 높이며 생존 전략 마련에 부심하고 있습니다. 전문가들은 CBDC가 도입되면 은행의 예금 수취 기능이 약화될 수 있다는 우려도 제기하고 있지만, 오히려 새로운 디지털 금융 상품 개발의 기회가 될 수 있다는 낙관론도 만만치 않습니다.

가상자산 시장 또한 제도권 안착에 속도를 내고 있습니다. 정부는 '가상자산 이용자 보호법'을 강화하고, 기관 투자자들의 시장 진입을 허용하는 방안을 검토 중입니다. 이는 가상자산을 투기 수단이 아닌 건전한 투자 자산으로 육성하겠다는 의지로 풀이됩니다. 비트코인과 이더리움 등 주요 가상자산은 현물 ETF 승인 이후 변동성이 줄어들며 안정적인 자산 배분 수단으로 자리 잡아가고 있습니다.

부동산 시장에서는 '토큰 증권(STO)'을 통한 조각 투자가 활성화되고 있습니다. 고가의 빌딩이나 토지를 디지털 토큰으로 나누어 소액으로 투자할 수 있게 되면서, 일반 투자자들의 부동산 접근성이 크게 향상되었습니다. STO는 투명한 수익 배분과 빠른 유동성 확보가 가능해 새로운 재테크 수단으로 각광받고 있습니다. 다만, 기초 자산의 가치 평가와 투자자 보호를 위한 제도적 보완은 여전히 숙제로 남아 있습니다.

금융권 관계자는 "2026년은 화폐의 개념이 종이에서 코드로 완전히 바뀌는 원년이 될 것"이라며 "디지털 금융 문해력이 개인과 기업의 경쟁력을 가르는 핵심 지표가 될 것"이라고 강조했습니다. 정부는 디지털 격차 해소를 위해 고령층 등 정보 취약 계층을 위한 교육 프로그램을 확대하고, 보안 사고 예방을 위한 통합 관제 시스템을 강화할 계획입니다.

결론적으로 CBDC와 가상자산, STO로 이어지는 디지털 금융 혁명은 우리 삶의 방식을 근본적으로 바꿀 것입니다. 더 빠르고, 더 안전하며, 더 투명한 금융 시스템을 구축하기 위한 여정에서 대한민국이 글로벌 표준을 선도할 수 있을지 주목됩니다. 기술의 진보가 가져올 혜택이 모든 국민에게 고루 돌아갈 수 있도록 세심한 정책적 배려가 필요한 시점입니다.`,
        image: "https://picsum.photos/seed/cbdc2026/1200/800"
      }
    ]
  },
  {
    id: "reporter_4",
    db_user_id: 994,
    name: "최기자",
    newsAgency: "한겨레",
    specialty: ["사회", "노동", "환경"],
    articles: [
      { 
        id: "art_4", 
        title: "탄소 포집 기술(CCUS) 혁신... '기후 위기' 극복의 희망 보이나", 
        date: "2026-03-05", 
        content: `기후 위기가 임계점에 다다랐다는 경고가 잇따르는 가운데, 대기 중 탄소를 직접 포집하여 자원화하는 CCUS(Carbon Capture, Utilization and Storage) 기술이 획기적인 발전을 거듭하며 인류의 새로운 희망으로 떠오르고 있습니다. 오늘(5일) 국내 연구진은 기존 대비 효율은 2배 높이고 비용은 절반으로 줄인 차세대 탄소 포집 촉매 개발에 성공했다고 발표했습니다.

이번 기술 혁신은 탄소 중립 달성을 위한 '마지막 퍼즐'로 불립니다. 단순히 탄소 배출을 줄이는 것을 넘어, 이미 배출된 탄소를 제거하고 이를 건축 자재나 화학 원료로 재활용할 수 있게 되었기 때문입니다. 특히 철강, 시멘트 등 탄소 배출량이 많은 산업군에서 이 기술을 도입할 경우, 산업 경쟁력을 유지하면서도 환경 목표를 달성할 수 있는 길이 열립니다. 정부는 2026년을 'CCUS 상용화의 원년'으로 선포하고 관련 인프라 구축에 대규모 예산을 투입하기로 했습니다.

사회적으로는 '기후 난민' 문제가 수면 위로 떠오르고 있습니다. 해수면 상승과 기상 이변으로 삶의 터전을 잃은 이들이 늘어나면서, 국제적인 연대와 대책 마련이 시급해졌습니다. 우리나라도 해안가 저지대 주민들을 위한 이주 대책과 재난 방재 시스템 강화를 서두르고 있습니다. 기후 위기는 단순히 환경 문제를 넘어 인권과 생존권의 문제로 확장되고 있습니다.

노동 시장에서도 '녹색 일자리'로의 전환이 가속화되고 있습니다. 내연기관차 정비 인력들이 전기차와 수소차 정비 교육을 받고, 화석 연료 발전소 노동자들이 신재생 에너지 분야로 재취업할 수 있도록 돕는 '정의로운 전환' 프로그램이 본격 가동 중입니다. 이는 산업 구조 변화 과정에서 소외되는 이들이 없도록 사회적 안전망을 구축하는 중요한 과정입니다.

환경 단체들은 기술적 해결책도 중요하지만, 근본적인 소비 패턴의 변화와 기업의 책임 있는 자세를 요구하고 있습니다. 플라스틱 사용 금지를 넘어, 제품의 생산부터 폐기까지 전 과정에서 환경 부하를 최소화하는 '순환 경제' 시스템 정착이 필요하다는 주장입니다. 소비자들 또한 '미닝 아웃(Meaning Out)'을 통해 환경 보호에 앞장서는 기업의 제품을 선택하며 시장의 변화를 이끌어내고 있습니다.

전문가들은 "2026년은 인류가 기후 위기에 맞서 싸울 수 있는 마지막 기회의 창이 열려 있는 시기"라고 경고합니다. CCUS와 같은 혁신 기술이 시장에 안착하고, 사회 전반의 인식 변화가 실질적인 행동으로 이어져야만 지구의 온도 상승을 막을 수 있습니다. 정부는 탄소세 도입 등 강력한 정책 수단을 동원하여 기업들의 참여를 독려하고, 국제 사회와의 공조를 강화해야 합니다.

결국 기후 위기 극복은 우리 모두의 책임입니다. 편리함을 조금 포기하더라도 지속 가능한 지구를 위해 연대하고 실천하는 자세가 필요합니다. 기술의 진보가 가져온 희망의 불씨를 살려, 후손들에게 건강한 지구를 물려주기 위한 우리의 노력은 멈추지 말아야 합니다. 선언을 넘어선 실질적인 행동이 그 어느 때보다 간절한 시점입니다.`,
        image: "https://picsum.photos/seed/climate2026/1200/800"
      }
    ]
  },
  {
    id: "reporter_5",
    db_user_id: 995,
    name: "정리포터",
    newsAgency: "SBS",
    specialty: ["IT", "AI", "플랫폼"],
    articles: [
      { 
        id: "art_5", 
        title: "AGI(인공일반지능) 초기 단계 진입... 로봇-인간 협업 시대 도래", 
        date: "2026-03-05", 
        content: `인간의 지능과 대등하거나 이를 능가하는 인공일반지능(AGI)의 초기 모델이 공개되면서 IT 업계는 물론 사회 전반에 거대한 파장이 일고 있습니다. 오늘(5일) 글로벌 AI 선도 기업들은 단순한 언어 모델을 넘어, 스스로 추론하고 문제를 해결하며 물리적 환경과 상호작용하는 차세대 AI 시스템을 선보였습니다.

이번에 공개된 AGI 초기 모델은 특정 분야에 국한되지 않고 범용적인 업무 수행이 가능하다는 점이 특징입니다. 복잡한 법률 문서를 분석하여 변론 전략을 세우는 것은 물론, 실시간으로 변화하는 시장 상황을 파악하여 최적의 비즈니스 모델을 제안하기도 합니다. 특히 인간의 감정을 이해하고 공감하는 능력이 비약적으로 향상되어, 교육, 상담, 의료 등 고도의 인간적 상호작용이 필요한 분야에서도 활용 가능성을 입증했습니다.

로봇 기술과의 결합은 더욱 놀랍습니다. AI가 탑재된 휴머노이드 로봇은 가정과 산업 현장에 투입되어 인간과 나란히 협업하기 시작했습니다. 단순 반복 노동을 넘어, 정교한 수술 보조나 재난 현장에서의 인명 구조 등 위험하고 복잡한 업무를 로봇이 담당하게 되었습니다. 이는 노동력 부족 문제를 해결하는 동시에 인류의 삶의 질을 한 단계 높여줄 것으로 기대됩니다.

하지만 AGI의 등장은 심각한 윤리적, 사회적 질문을 던지고 있습니다. AI의 결정에 대한 책임 소재는 누구에게 있는지, AI가 인간의 일자리를 대체함에 따라 발생하는 소득 불평등 문제는 어떻게 해결할 것인지에 대한 논의가 시급합니다. 정부는 'AI 기본법'을 제정하여 AI의 안전성과 투명성을 확보하고, AI로 인한 사회적 부작용을 최소화하기 위한 제도적 장치 마련에 착수했습니다.

플랫폼 기업들은 AGI를 기반으로 한 개인 맞춤형 서비스 경쟁에 돌입했습니다. 사용자의 취향과 습관을 완벽히 파악하여 필요한 정보를 미리 제공하고, 복잡한 일정을 자동으로 관리해 주는 'AI 비서' 서비스가 대중화되고 있습니다. 이는 정보 검색의 시대를 넘어, AI가 사용자의 의도를 선제적으로 파악하고 실행하는 '인텔리전트 플랫폼' 시대로의 전환을 의미합니다.

IT 전문가들은 "2026년은 인류가 도구를 사용하는 존재에서 도구와 공존하는 존재로 진화하는 원년"이라고 평가합니다. AI는 더 이상 외부의 기술이 아닌, 우리 삶의 일부가 되었습니다. 기술의 발전 속도가 인간의 적응 속도를 앞지르지 않도록, 기술에 대한 비판적 사고와 인문학적 성찰이 그 어느 때보다 중요해졌습니다.

결국 AGI 시대의 주인공은 인간이어야 합니다. 기술이 인간을 소외시키는 것이 아니라, 인간의 잠재력을 극대화하고 더 나은 세상을 만드는 데 기여할 수 있도록 지혜를 모아야 합니다. AI와 인간이 조화롭게 공존하며 만들어갈 새로운 문명의 미래가 우리 앞에 펼쳐지고 있습니다. 혁신과 책임이 공존하는 건강한 AI 생태계를 구축하기 위한 우리의 여정은 이제 시작입니다.`,
        image: "https://picsum.photos/seed/ai2026/1200/800"
      }
    ]
  }
];

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = 3000;

  app.use(express.json());
  app.use("/uploads", express.static("uploads"));
  app.get("/앵커 나현.png", (req, res) => {
    res.sendFile(path.join(process.cwd(), "앵커 나현.png"));
  });

  // Socket.io connection
  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      socket.join(`user_${userId}`);
    });
  });

  // Helper to send notification
  const sendNotification = (userId: number, type: string, message: string) => {
    const info = db.prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)").run(userId, type, message);
    io.to(`user_${userId}`).emit("notification", {
      id: info.lastInsertRowid,
      type,
      message,
      created_at: new Date().toISOString()
    });
  };

  // Auth Routes
  app.post("/api/auth/signup", (req, res) => {
    const { company, department, name, email } = req.body;
    try {
      const info = db.prepare("INSERT INTO users (company, department, name, email) VALUES (?, ?, ?, ?)").run(company, department, name, email);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  // API Routes
  app.get("/api/memos", (req, res) => {
    const memos = db.prepare("SELECT * FROM memos ORDER BY created_at DESC").all();
    res.json(memos);
  });

  app.post("/api/memos", (req, res) => {
    const { article_url, content } = req.body;
    const info = db.prepare("INSERT INTO memos (article_url, content, created_at) VALUES (?, ?, date('now'))").run(article_url, content);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/memos/:id", (req, res) => {
    const { id } = req.params;
    const { content, is_favorite } = req.body;
    
    try {
      if (content !== undefined) {
        db.prepare("UPDATE memos SET content = ? WHERE id = ?").run(content, id);
      }
      if (is_favorite !== undefined) {
        db.prepare("UPDATE memos SET is_favorite = ? WHERE id = ?").run(is_favorite ? 1 : 0, id);
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Server] Update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/memos/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    try {
      const info = db.prepare("DELETE FROM memos WHERE id = ?").run(id);
      if (info.changes > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Memo not found" });
      }
    } catch (error: any) {
      console.error("[Server] Delete error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // New endpoint to fetch article content
  app.post("/api/fetch-article", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove scripts, styles, and other noise
      $('script, style, nav, footer, header, aside, .ads, #ads').remove();

      // Try to find the main content
      let content = $('article').text() || $('main').text() || $('body').text();
      
      // Clean up whitespace
      content = content.replace(/\s+/g, ' ').trim().substring(0, 15000); // Limit to 15k chars for Gemini

      res.json({ content });
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article content" });
    }
  });

  // Community Routes
  app.get("/api/posts", (req, res) => {
    const { category, search, sort } = req.query;
    let query = `
      SELECT p.*, u.name as user_name, u.company as user_company,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category) {
      query += " AND p.category = ?";
      params.push(category);
    }
    if (search) {
      query += " AND (p.title LIKE ? OR p.content LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (sort === 'popular') {
      query += " ORDER BY p.like_count DESC, p.created_at DESC";
    } else {
      query += " ORDER BY p.created_at DESC";
    }

    const posts = db.prepare(query).all(...params);
    res.json(posts);
  });

  app.post("/api/posts", upload.single('file'), async (req: any, res) => {
    const { user_id, category, title, content, link_url } = req.body;
    const file = req.file;

    let link_title = null;
    let link_description = null;
    let link_image = null;

    if (link_url) {
      try {
        const response = await fetch(link_url);
        const html = await response.text();
        const $ = cheerio.load(html);
        link_title = $('meta[property="og:title"]').attr('content') || $('title').text();
        link_description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        link_image = $('meta[property="og:image"]').attr('content');
      } catch (err) {
        console.error('Error fetching link preview:', err);
      }
    }
    
    const info = db.prepare(`
      INSERT INTO posts (user_id, category, title, content, link_url, link_title, link_description, link_image, file_url, file_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(user_id, category, title, content, link_url, link_title, link_description, link_image, file ? `/uploads/${file.filename}` : null, file ? file.originalname : null);
    
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/posts/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE posts SET view_count = view_count + 1 WHERE id = ?").run(id);
    const post = db.prepare(`
      SELECT p.*, u.name as user_name, u.company as user_company,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id);
    res.json(post);
  });

  app.put("/api/posts/:id", upload.single('file'), async (req: any, res) => {
    const { id } = req.params;
    const { category, title, content, link_url } = req.body;
    const file = req.file;

    let link_title = null;
    let link_description = null;
    let link_image = null;

    if (link_url) {
      try {
        const response = await fetch(link_url);
        const html = await response.text();
        const $ = cheerio.load(html);
        link_title = $('meta[property="og:title"]').attr('content') || $('title').text();
        link_description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
        link_image = $('meta[property="og:image"]').attr('content');
      } catch (err) {
        console.error('Error fetching link preview:', err);
      }
    }

    try {
      let query = "UPDATE posts SET category = ?, title = ?, content = ?, link_url = ?, link_title = ?, link_description = ?, link_image = ?";
      const params = [category, title, content, link_url, link_title, link_description, link_image];

      if (file) {
        query += ", file_url = ?, file_name = ?";
        params.push(`/uploads/${file.filename}`, file.originalname);
      }

      query += " WHERE id = ?";
      params.push(id);

      db.prepare(query).run(...params);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/posts/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM comments WHERE post_id = ?").run(id);
    db.prepare("DELETE FROM posts WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/posts/:id/like", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE posts SET like_count = like_count + 1 WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/posts/:id/comments", (req, res) => {
    const { id } = req.params;
    const comments = db.prepare(`
      SELECT c.*, u.name as user_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(id);
    res.json(comments);
  });

  app.post("/api/comments", (req, res) => {
    const { post_id, user_id, content } = req.body;
    const info = db.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)").run(post_id, user_id, content);
    
    // Notify post owner
    const post = db.prepare("SELECT user_id, title FROM posts WHERE id = ?").get(post_id);
    if (post && post.user_id !== user_id) {
      sendNotification(post.user_id, 'comment', `내 게시글 "${post.title}"에 새로운 댓글이 달렸습니다.`);
    }

    // Handle mentions
    const mentions = content.match(/@(\S+)/g);
    if (mentions) {
      mentions.forEach((mention: string) => {
        const name = mention.substring(1);
        const mentionedUser = db.prepare("SELECT id FROM users WHERE name = ?").get(name);
        if (mentionedUser && mentionedUser.id !== user_id) {
          sendNotification(mentionedUser.id, 'mention', `게시글 댓글에서 당신을 언급했습니다.`);
        }
      });
    }

    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/notifications/:userId", (req, res) => {
    const { userId } = req.params;
    const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").all(userId);
    res.json(notifications);
  });

  app.post("/api/notifications/:id/read", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // AI Newsroom Special Features
  app.get("/api/newsroom/network-map", (req, res) => {
    res.json(reporters);
  });

  app.get("/api/newsroom/reporter-recommendation/:topic", (req, res) => {
    const { topic } = req.params;
    const recommended = reporters.filter(r => 
      r.specialty.some(s => topic.includes(s)) || 
      r.articles.some(a => a.title.includes(topic))
    );
    res.json(recommended.length > 0 ? recommended : reporters.slice(0, 2));
  });

  app.post("/api/newsroom/collaboration-request", (req, res) => {
    const { reporterId, requesterName, requesterCompany } = req.body;
    const reporter = reporters.find(r => r.id === reporterId);
    if (!reporter) return res.status(404).json({ error: "Reporter not found" });

    // Send real notification to the reporter's user account
    if (reporter.db_user_id) {
      sendNotification(
        reporter.db_user_id, 
        'collab', 
        `${requesterCompany}의 ${requesterName}님이 당신에게 협업을 요청했습니다. 'AI 뉴스룸'에서 확인해보세요.`
      );
    }

    console.log(`Collaboration request for ${reporter.name} from ${requesterName} (${requesterCompany})`);
    res.json({ success: true, message: `${reporter.name} 기자님께 협업 요청이 전달되었습니다.` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
