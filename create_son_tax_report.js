const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType, PageBreak } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const borders = { top: border, bottom: border, left: border, right: border };

const children = [
  new Paragraph({ text: "", spacing: { after: 300 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "아들의 양도세·취득세 종합 분석 보고서", size: 48, bold: true, color: "1F4E78" })]
  }),
  new Paragraph({ text: "", spacing: { after: 120 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "중앙동 아파트(상생임대주택 특례) × 영덕동 부담부증여", size: 24, color: "2E75B6" })]
  }),
  new Paragraph({ text: "", spacing: { after: 400 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "작성일: 2026년 6월 12일", size: 20, color: "666666" })]
  }),
  new Paragraph({ children: [new PageBreak()] }),

  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Executive Summary")] }),
  new Paragraph({
    children: [new TextRun("본 보고서는 아들이 중앙동 아파트를 2028년 6월에 양도할 때의 양도세 및 영덕동을 부담부증여로 받을 때의 취득세 구조를 종합적으로 분석합니다.")]
  }),

  new Paragraph({ children: [new PageBreak()] }),

  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("PART 1. 중앙동 아파트 양도세 분석")] }),
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1-1. 현황 요약")] }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("취득: 2019년 6월 (6.5억)")]
  }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("보유 기간: 9년 (2019.6 ~ 2028.6)")]
  }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("직전 임대: 2019.6~2024.5 (약 5년)")]
  }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("상생임대차: 2024.6~2028.6 (4년), 동일 임차인, 5% 이내 인상")]
  }),

  new Paragraph({ text: "", spacing: { after: 240 } }),

  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1-2. 상생임대주택 특례 요건 충족")] }),
  new Paragraph({
    children: [new TextRun({ text: "✅ 모든 요건 충족 가능성 높음", bold: true, color: "00B050" })]
  }),
  new Paragraph({
    children: [new TextRun("→ 결론: 상생임대주택 특례 적용으로 양도세 극소화 가능")]
  }),

  new Paragraph({ children: [new PageBreak()] }),

  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("PART 2. 영덕동 부담부증여 취득세")] }),
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2-1. 부담부증여 세금 구조")] }),
  new Paragraph({
    children: [new TextRun({ text: "13억 = 유상 5억 + 무상 8억", bold: true })]
  }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("유상부분(5억): 취득세(매매 세율) → 비조정 1.5% / 조정 8.5%")]
  }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("무상부분(8억): 취득세(증여 세율) → 일반 3.8% / 중과 12.4%")]
  }),

  new Paragraph({ text: "", spacing: { after: 240 } }),

  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2-2. 아들이 2주택자일 때 중과세")] }),
  new Paragraph({
    children: [new TextRun("영덕동 취득 시 이미 중앙동을 소유 → 2주택자 → 취득세 중과 적용")]
  }),

  new Paragraph({ children: [new PageBreak()] }),

  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("PART 3. 3가지 세금의 톱니바퀴")] }),
  new Paragraph({
    children: [new TextRun("부담부증여는 단순히 '취득세만 줄이는 거래'가 아닙니다.")]
  }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("① 아들의 취득세 (부담금 크기에 따라 변동)")]
  }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("② 아들의 증여세 (증여분 크기에 따라 변동)")]
  }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("③ 부모의 양도소득세 (부담금 = 부모가 판 것)")]
  }),
  new Paragraph({
    children: [new TextRun({ text: "→ 부담금을 줄이면 항상 유리하지 않습니다!", bold: true, color: "C00000" })]
  }),

  new Paragraph({ children: [new PageBreak()] }),

  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("PART 4. 세무사 상담 체크리스트")] }),
  new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("필수 질문")] }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("Q1. 성남 중원구(중앙동) & 용인 기흥구(영덕동)의 2028년 조정지역 여부?")]
  }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("Q2. 아들의 유상/무상 분리 취득세 정확한 계산")]
  }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("Q3. 아들이 2주택자일 때 취득세 중과세율")]
  }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("Q4. 3가지 세금의 Total Tax 시뮬레이션 (부담금별 시나리오)")]
  }),
  new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun("Q5. 증여 시점 최적화 (2028년 이전 vs 이후 세금 차이)")]
  }),

  new Paragraph({ children: [new PageBreak()] }),

  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("최종 결론")] }),
  new Paragraph({
    children: [new TextRun({ text: "반드시 세무사 상담이 필수입니다!",bold: true, size: 28, color: "C00000" })]
  }),
  new Paragraph({
    children: [new TextRun("본 분석은 일반적인 세법 원리를 바탕으로 하며, 실제 세금 계산은 정확한 재산 현황, 조정지역 여부, 부모의 다주택 상태 등에 따라 달라집니다. 면허가 있는 세무사와 반드시 상담하여 정확한 시뮬레이션을 받으신 후 결정하시기 바랍니다.")]
  })
];

const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: "bullet", text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/Users/l/project/my_days/아들의_양도세_취득세_종합분석_보고서.docx", buffer);
  console.log("✅ 문서 생성 완료: 아들의_양도세_취득세_종합분석_보고서.docx");
});
