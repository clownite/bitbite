import type { ReactElement } from "react";
import type { LifeRoad, LifeSex } from "../pet/life";
import { useT } from "../i18n/LanguageContext";

function Pix({ rows, ink, size = 26 }: { rows: string[]; ink: Record<string, string>; size?: number }) {
  const h = rows.length;
  const w = Math.max(...rows.map((row) => row.length));
  const cells: ReactElement[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const fill = ink[row[x]];
      if (!fill) continue;
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />);
    }
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden>
      {cells}
    </svg>
  );
}

const MALE = [
  "......111",
  "......1.1",
  ".....1..1",
  ".1111.1..",
  "1....11..",
  "1....1...",
  "1....1...",
  ".1111....",
];

const FEMALE = [
  ".11111.",
  "1.....1",
  "1.....1",
  "1.....1",
  ".11111.",
  "...1...",
  "..111..",
  "...1...",
];

const TREE = [
  "...33...",
  "..3223..",
  ".322223.",
  "22222222",
  "..2222..",
  "...11...",
  "...11...",
  "..1111..",
];

const FLOWER = [
  ".2.3.2.",
  "2.232.2",
  ".22222.",
  "...1...",
  "...1...",
];

/** Sex and road, drawn as signs in the top-left of the home card. */
export function LifeMarks({ sex, road }: { sex: LifeSex; road: LifeRoad | null }) {
  const { t } = useT();
  return (
    <div className="life-marks" data-testid="life-marks">
      <span className="life-badge" data-testid={`life-${sex}`} aria-label={t(sex === "boy" ? "life.boy" : "life.girl")}>
        <Pix
          rows={sex === "boy" ? MALE : FEMALE}
          ink={{ "1": sex === "boy" ? "#7ad7ff" : "#ff4d8a" }}
        />
      </span>
      {road ? (
        <span className="life-badge" data-testid={`life-${road}`} aria-label={t(road === "wild" ? "life.wild" : "life.tended")}>
          <Pix
            rows={road === "wild" ? TREE : FLOWER}
            ink={road === "wild"
              ? { "1": "#8a5a32", "2": "#3fa84a", "3": "#8fd98a" }
              : { "1": "#3fa84a", "2": "#ff7aa2", "3": "#ffe14a" }}
          />
        </span>
      ) : null}
    </div>
  );
}
