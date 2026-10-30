import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { type TableCellProps } from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import type { ReactNode } from "react";
import { font } from "../theme/tokens";

/*
 * Data table parts on MUI Table. The look (padding, borders, header row, hover) lives in the theme;
 * these add the semantics every table here needs: a caption, column and row headers, and numbers
 * set right-aligned in the monospace face.
 */

const numeric = { textAlign: "right", fontFamily: font.mono, fontVariantNumeric: "tabular-nums" } as const;
const mono = { fontFamily: font.mono, fontVariantNumeric: "tabular-nums" } as const;

/** A table with a caption for screen readers: `head` is the header cells, children are the body rows. */
export function DataTable({ caption, head, children }: { caption: string; head: ReactNode; children: ReactNode }) {
  return (
    <Table>
      <caption className="visually-hidden">{caption}</caption>
      <TableHead>
        <TableRow>{head}</TableRow>
      </TableHead>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

export { TableRow as Row };

/** Column header. `numeric` right-aligns it over a column of numbers. */
export function HeadCell({ numeric: isNumeric = false, children }: { numeric?: boolean; children: ReactNode }) {
  return (
    <TableCell scope="col" sx={isNumeric ? numeric : undefined}>
      {children}
    </TableCell>
  );
}

/** The first cell of a body row, naming the row (for example the part). */
export function RowHeader({ children, ...rest }: TableCellProps) {
  return (
    <TableCell component="th" scope="row" sx={{ fontWeight: 700 }} {...rest}>
      {children}
    </TableCell>
  );
}

/** A body cell. `mono` sets ids and timestamps in the monospace face. */
export function Cell({ mono: isMono = false, children, ...rest }: TableCellProps & { mono?: boolean }) {
  return (
    <TableCell sx={isMono ? mono : undefined} {...rest}>
      {children}
    </TableCell>
  );
}

/** A number: right-aligned, monospace, tabular figures. */
export function NumCell({ children }: { children: ReactNode }) {
  return <TableCell sx={numeric}>{children}</TableCell>;
}

/** A full-width row under a row, holding that row's error message (its id is the row control's aria-describedby). */
export function ErrorRow({ id, colSpan, children }: { id: string; colSpan: number; children: ReactNode }) {
  return (
    <TableRow>
      <TableCell id={id} colSpan={colSpan} sx={{ p: 0 }}>
        {children}
      </TableCell>
    </TableRow>
  );
}
