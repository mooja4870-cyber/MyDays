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
      new Paragraph({ text: "", spacing: { after: 300 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "영덕동 부담부증여 세금 검토 보고서", size: 48, bold: true, color: "1F4E78" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "(아들 1주택자 상태 기준 수정본)", size: 24, color: "C00000" })] }),
      new Paragraph({ text: "", spacing: { after: 120 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "작성: 2026년 6월 12일 (수정)", size: 20, color: "666666" })] }),
      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("핵심 전제 조건 (수정)")] }),
      new Paragraph({ children: [new TextRun({ text: "⚠️ 중요: 아들이 이미 1주택 소유자!", bold: true, color: "C00000" })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("중앙동 아파트: 6.5억 (2019.6 취득, 보유 9년)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("현재: 거주 후 2025.3.28 전세")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("상생임대주택 특례: 2028.6 매도 시 거주요건 면제")] }),
      new Paragraph({ text: "", spacing: { after: 240 } }),
      
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("PART 1. 아들의 취득세 (수정 계산)")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1-1. 구조")] }),
      new Paragraph({ children: [new TextRun("부담부증여: 13억 = 유상 5억 + 무상 8억")] }),
      new Paragraph({ text: "", spacing: { after: 120 } }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1-2. 아들의 취득세 (2주택자 조정지역)")] }),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2000, 3500, 3526],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "구분", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "금액 & 세율", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 3526, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "세금 (수정)", bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("유상부분")] })] }),
              new TableCell({ borders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("5억 × 8.5% (2주택 중과)")] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 3526, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "약 4,250만", bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("무상부분")] })] }),
              new TableCell({ borders, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("8억 × 12.4% (증여 중과)")] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 3526, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "약 992만", bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "FCE4D6", type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "합계", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "FCE4D6", type: ShadingType.CLEAR }, width: { size: 3500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("총 취득세")] })] }),
              new TableCell({ borders, shading: { fill: "FCE4D6", type: ShadingType.CLEAR }, width: { size: 3526, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "약 5,242만", bold: true, color: "C00000" })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ text: "", spacing: { after: 300 } }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("PART 2. 최적 시점 분석 (신규)")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2-1. 2028년 이전 영덕동 받기 (❌)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("아들: 2주택자 상태")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("취득세: 약 5,242만 (2주택 중과)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("미래 양도세: 극도로 높음 (2주택 중과)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "총 세금: 약 8,000만 이상", bold: true, color: "C00000" })] }),
      new Paragraph({ text: "", spacing: { after: 240 } }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2-2. 2028년 이후 영덕동 받기 (✅)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("2028.6: 중앙동 매도 (상생임대 특례) = 약 0~500만")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("아들: 1주택자 상태에서 영덕동 받기")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("취득세: 조정지역 1주택 (약 1,000만 미만)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "총 세금: 약 2,000만", bold: true, color: "00B050" })] }),
      new Paragraph({ text: "", spacing: { after: 240 } }),
      new Paragraph({ children: [new TextRun({ text: "→ 시점 선택으로 최대 6,000만 차이!", bold: true, color: "C00000", size: 28 })] }),
      new Paragraph({ text: "", spacing: { after: 300 } }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("PART 3. 부모(mooja) 양도세 (수정)")] }),
      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3-1. mooja의 상황")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("위례: 조정지역")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("영덕동: 조정지역")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("결론: 조정지역 다주택자 양도 = 중과세율!")] }),
      new Paragraph({ text: "", spacing: { after: 240 } }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3-2. mooja 양도세 재계산")] }),
      new Table({
        width: { size: 9026, type: WidthType.DXA },
        columnWidths: [2200, 3413, 3413],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "영덕동 시세", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 3413, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "기존", bold: true })] })] }),
              new TableCell({ borders, shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, width: { size: 3413, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "수정 (중과)", bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("10억")] })] }),
              new TableCell({ borders, width: { size: 3413, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("약 454만")] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 3413, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "약 800~1,000만?", bold: true })] })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("13억")] })] }),
              new TableCell({ borders, width: { size: 3413, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun("약 2,754만")] })] }),
              new TableCell({ borders, shading: { fill: "FFE699", type: ShadingType.CLEAR }, width: { size: 3413, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: "약 4,000~5,000만?", bold: true, color: "C00000" })] })] })
            ]
          })
        ]
      }),
      new Paragraph({ text: "", spacing: { after: 120 } }),
      new Paragraph({ children: [new TextRun({ text: "⚠️ 세무사와 정확한 다주택 중과세율 확인 필수!", bold: true, color: "C00000" })] }),
      new Paragraph({ text: "", spacing: { after: 300 } }),

      new Paragraph({ children: [new PageBreak()] }),

      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("최종 결론")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("1. 2028년 6월: 중앙동 매도 (상생임대 특례 비과세)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("2. 2028년 7월 이후: 영덕동 아들에게만 부담부증여")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("3. 세무사와 아들 2주택자 상태 세금 재계산")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("4. mooja 다주택자 조정지역 양도세 중과율 확인")] }),
      new Paragraph({ text: "", spacing: { after: 300 } }),

      new Paragraph({ children: [new TextRun({ text: "이 보고서는 아들이 현재 1주택 소유자임을 전제로 한 수정본입니다. 정확한 세금은 반드시 세무사와 확인하세요.", italic: true, color: "666666" })] })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/Users/l/project/my_days/영덕양도세_검토보고서_수정본.docx", buffer);
  console.log("✅ 수정 완료: 영덕양도세_검토보고서_수정본.docx");
});
