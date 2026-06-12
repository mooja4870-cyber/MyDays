const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType, PageBreak } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const borders = { top: border, bottom: border, left: border, right: border };

const doc = new Document({
  numbering: {
    config: [{ reference: "bullets", levels: [{ level: 0, format: "bullet", text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }]
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: [
      new Paragraph({ text: "", spacing: { after: 200 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "위례 아파트 · 영덕동 상가주택", size: 32, bold: true, color: "1F4E78" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "양도소득세 · 부담부증여 종합 검토 보고서", size: 32, bold: true, color: "1F4E78" })] }),
      new Paragraph({ text: "", spacing: { after: 120 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "작성: 2026년 6월 12일 (수정본 - 아들 1주택자 기준)", size: 20, color: "C00000" })] }),
      new Paragraph({ text: "", spacing: { after: 300 } }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. 한눈에 보는 결론 (수정)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "현 상태(영덕동 자진말소 완료)로는 위례 거주주택 비과세 불가 — 국세청 회신으로 확정.", bold: true })] }),
      new Paragraph({ text: "", spacing: { after: 120 } }),
      new Paragraph({ children: [new TextRun("⚠️ 조정대상지역 확정:")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("위례 아파트: 성남시 수정구 → 조정대상지역 O")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("영덕동 상가: 용인시 기흥구 → 조정대상지역 O")] }),
      new Paragraph({ text: "", spacing: { after: 120 } }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("위례 비과세를 살리는 길: ① 영덕동 제3자 매도 또는 ② 아들 부부에게 부담부증여 → 위례 1세대1주택 → 비과세(약 680만).")] }),
      new Paragraph({ text: "", spacing: { after: 120 } }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "⚠️ 아들은 이미 1주택 소유자(중앙동 6.5억)", bold: true, color: "C00000" })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("영덕동 취득 시 2주택자 → 조정지역 2주택 중과세 적용")] }),
      new Paragraph({ text: "", spacing: { after: 120 } }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("위례를 2주택 상태로 먼저 팔면 조정지역 중과로 부부 세금 약 6.3억 — 절대 금지.")] }),
      new Paragraph({ text: "", spacing: { after: 120 } }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("증여 전 정리할 것: 상가 임대소득 수정신고(약 1,000만~1,100만, 주택은 매년 신고 완료), 상가 사업자등록, 혼인신고.")] }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. 자산 및 임대 현황")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2-1. 보유 자산")] }),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [1500, 2200, 2200, 1600, 1526],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "구분", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "소재지", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "취득/현시세", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 1600, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "명의", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 1526, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "규제", bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("위례 아파트")] })] }),
              new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("성남시 수정구")] })] }),
              new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("5.5억 / 16억")] })] }),
              new TableCell({ borders, width: { size: 1600, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("부부 공동")] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 1526, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "조정O", bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("영덕동 상가")] })] }),
              new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("용인시 기흥구")] })] }),
              new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("9억 / 13억")] })] }),
              new TableCell({ borders, width: { size: 1600, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("본인 단독")] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 1526, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "조정O", bold: true })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ text: "", spacing: { after: 240 } }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. 영덕동 부담부증여 시나리오 (수정)")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5-1. 나(증여자)의 양도세 — 채무 4.8억 유상양도분 (다주택자 중과 반영)")] }),
      
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [1500, 2000, 2000, 1600, 1926],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "증여가액", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "양도차익", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "과세표준", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 1600, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "기존", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 1926, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "수정 (중과)", bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("10억")] })] }),
              new TableCell({ borders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("4,800만")] })] }),
              new TableCell({ borders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("3,590만")] })] }),
              new TableCell({ borders, width: { size: 1600, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("약 454만")] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 1926, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "약 800만?", bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("13억")] })] }),
              new TableCell({ borders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("7,800만")] })] }),
              new TableCell({ borders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("5,700만")] })] }),
              new TableCell({ borders, width: { size: 1600, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("약 2,754만")] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 1926, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "약 4,000~5,000만?", bold: true, color: "C00000" })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ text: "", spacing: { after: 240 } }),
      new Paragraph({ children: [new TextRun({ text: "⚠️ 다주택자 조정지역 양도: 기본세율 + 20%p 중과 적용. 정확한 세율은 세무사 확인 필수.", bold: true, color: "C00000" })] }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5-3. 취득세 (수증자, 아들 2주택자 기준 수정)")] }),
      
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [1500, 2000, 2000, 1600, 1926],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "증여가액", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "유상취득", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "무상취득", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 1600, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "기존", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 1926, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "수정 (2주택)", bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("10억")] })] }),
              new TableCell({ borders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("1,150만")] })] }),
              new TableCell({ borders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("약 2,030만")] })] }),
              new TableCell({ borders, width: { size: 1600, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("약 3,180만")] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 1926, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "약 3,180만", bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("13억")] })] }),
              new TableCell({ borders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("4,250만")] })] }),
              new TableCell({ borders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("992만")] })] }),
              new TableCell({ borders, width: { size: 1600, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("약 4,380만")] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 1926, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "약 5,242만", bold: true, color: "C00000" })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ text: "", spacing: { after: 240 } }),
      new Paragraph({ children: [new TextRun({ text: "⚠️ 아들 이미 1주택자: 조정지역 2주택 중과 적용. 유상 5억 × 8.5% + 무상 8억 × 12.4%", bold: true, color: "C00000" })] }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5-4. 총괄 — 가족 전체 세부담 vs 제3자 매도 (수정)")] }),
      
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [1200, 1300, 1500, 1400, 2000, 1626],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "증여가액", bold: true, size: 18 })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 1300, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "나(양도세)", bold: true, size: 18 })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "증여세(공동)", bold: true, size: 18 })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 1400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "취득세", bold: true, size: 18 })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "증여 총합 (수정)", bold: true, size: 18 })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 1626, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "제3자 매도", bold: true, size: 18 })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("10억")] })] }),
              new TableCell({ borders, width: { size: 1300, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("~800만")] })] }),
              new TableCell({ borders, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("5,200만")] })] }),
              new TableCell({ borders, width: { size: 1400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("3,180만")] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "약 9,180만", bold: true })] })] }),
              new TableCell({ borders, width: { size: 1626, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("약 1,412만")] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("13억")] })] }),
              new TableCell({ borders, width: { size: 1300, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("~4,500만")] })] }),
              new TableCell({ borders, width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("1억 1,200만")] })] }),
              new TableCell({ borders, width: { size: 1400, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("5,242만")] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "약 1억 9,942만", bold: true, color: "C00000" })] })] }),
              new TableCell({ borders, width: { size: 1626, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("약 1억 1,116만")] })] })
            ]
          })
        ]
      }),
      new Paragraph({ text: "", spacing: { after: 240 } }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("세금만 보면 제3자 매도가 저렴. 증여는 아들 부부 거처 유지 + 가족 자산이전의 대가로 약 8,800만 추가 부담 구조.")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("⚠️ 아들 1주택자 상태: 취득세 약 5,242만 (기존 4,380만 대비 약 862만 증가)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("⚠️ 나(나) 다주택자 조정지역 양도: 양도세 약 4,000~5,000만 (기존 2,754만 대비 약 1,200~2,250만 증가)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("증여가액은 시가인정액 — 다가구는 감정평가 2곳 평균으로 확정 권장. 저가 신고 시 국세청 자체 감정평가로 추징 위험.")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("인수 채무 4.8억은 국세청 매년 사후관리 — 아들 부부 소득으로 상환 필수, 부모 대납 시 증여세 추징.")] })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/Users/l/project/my_days/영덕양도세_검토보고서_최종수정본.docx", buffer);
  console.log("✅ 최종 수정 완료: 영덕양도세_검토보고서_최종수정본.docx");
});
