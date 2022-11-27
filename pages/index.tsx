import _, { xor } from "lodash";
import {
  styled,
  Box,
  Typography,
  FormControl,
  FormLabel,
  Input,
  FormHelperText,
  Sheet,
  Button,
} from "@mui/joy";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Backup } from "@mui/icons-material";

function combinations(
  n: number,
  k: number,
  fn: (a: number[]) => void,
  lo: number = 0,
  pre: number[] = []
): void {
  if (k == 0) {
    fn(pre);
    return;
  }
  for (let i = lo; i < n; i++) {
    pre.push(i);
    combinations(n, k - 1, fn, i + 1, pre);
    pre.pop();
  }
}

function isPrime(n: number) {
  for (let i = 2; i * i <= n; i++) {
    if (n % i == 0) return false;
  }
  return true;
}

function rightStrip(a: number[]): number[] {
  for (let i = a.length - 1; i >= -1; i--) {
    if (i < 0 || a[i] != 0) return a.slice(0, i + 1);
  }
  return a;
}

function divide(a: number[], b: number[]): number[][] {
  if (a.length < b.length) return [[], rightStrip(a)];
  const lastTerm = a[a.length - 1] / b[b.length - 1];
  for (let i = 0; i < b.length; i++) {
    a[a.length - b.length + i] -= lastTerm * b[i];
  }
  const res = divide(a.slice(0, -1), b);
  res[0].push(lastTerm);
  return res;
}

const cyclotomicPolynomials: Record<number, number[]> = {};
function cyclotomicPolynomial(n: number): number[] {
  if (cyclotomicPolynomials[n]) return cyclotomicPolynomials[n];
  if (n == 1) return [-1, 1];
  if (isPrime(n)) return Array(n).fill(1);
  else {
    let poly: number[] = Array(n + 1).fill(0);
    poly[n] = 1;
    poly[0] = -1;
    for (let i = 1; i < n; i++) {
      if (n % i == 0) {
        poly = divide(poly, cyclotomicPolynomial(i))[0];
      }
    }
    cyclotomicPolynomials[n] = poly;
    return poly;
  }
}

function polyToString(poly: number[]): string {
  let out = "";
  for (let i = poly.length - 1; i >= 0; i--) {
    if (poly[i]) {
      if (poly[i] > 0) out += " + ";
      else if (poly[i] < 0) out += " - ";
      if (Math.abs(poly[i]) > 1 || i == 0) out += Math.abs(poly[i]);
      if (i > 1) out += `x^${i}`;
      else if (i > 0) out += "x";
    }
  }
  out = out.slice(3);
  return out;
}

const eps = 1e-5;

function* factors(n: number) {
  for (let i = 1; i * i <= n; i++) {
    if (n % i == 0) {
      yield i;
      if (i * i != n) yield n / i;
    }
  }
}

type Chandelier = {
  nodes: number;
  active: number[];
};

let presin: number[][] = [[]];
let precos: number[][] = [[]];
for (let i = 1; i < 1000; i++) {
  presin.push(Array(i).fill(0));
  precos.push(Array(i).fill(0));
  for (let j = 0; j < i; j++) {
    presin[i][j] = Math.sin(((2 * j) / i) * Math.PI);
    precos[i][j] = Math.cos(((2 * j) / i) * Math.PI);
  }
}

function getCOM({ nodes, active }: Chandelier) {
  let count = 0;
  let com = [0, 0];
  for (let i of active) {
    const [x, y] = [presin[nodes][i], precos[nodes][i]];
    com[0] += x;
    com[1] += y;
    count++;
  }
  if (count == 0) return [0, 0];
  com[0] /= count;
  com[1] /= count;
  return com;
}

function balanced({ nodes, active }: Chandelier) {
  const [x, y] = getCOM({ nodes, active });
  return Math.abs(x) <= eps && Math.abs(y) <= eps;
}

function Chandelier(props: {
  chandelier: Chandelier;
  onToggle: (n: number) => void;
}) {
  const { nodes, active } = props.chandelier;
  const circles = [];
  let count = 0;
  for (let i = 0; i < nodes; i++) {
    const [x, y] = [
      Math.cos(((2 * i) / nodes) * Math.PI),
      Math.sin(((2 * i) / nodes) * Math.PI),
    ];
    circles.push(
      <circle
        key={i}
        cx={Math.cos(((2 * i) / nodes) * Math.PI)}
        cy={Math.sin(((2 * i) / nodes) * Math.PI)}
        r={0.02}
        fill={active.includes(i) ? "red" : "black"}
        onClick={() => props.onToggle(i)}
      ></circle>
    );
    if (active.includes(i)) count++;
  }
  const com = getCOM(props.chandelier);
  for (let i = 0; i < nodes; i++) {
    const [x, y] = [
      Math.cos(((2 * i) / nodes) * Math.PI),
      Math.sin(((2 * i) / nodes) * Math.PI),
    ];
    if (active.includes(i)) {
      circles.push(
        <line
          key={i + nodes}
          x1={Math.cos(((2 * i) / nodes) * Math.PI)}
          y1={Math.sin(((2 * i) / nodes) * Math.PI)}
          x2={com[0]}
          y2={com[1]}
          strokeWidth="0.01"
          stroke={active.includes(i) ? "red" : "black"}
        ></line>
      );
    }
  }
  if (count > 1)
    circles.push(
      0,
      0,
      <circle
        key={"com"}
        cx={com[0]}
        cy={com[1]}
        r={0.02}
        fill={
          Math.abs(com[0]) <= eps && Math.abs(com[1]) <= eps ? "green" : "black"
        }
      ></circle>
    );
  return <svg viewBox="-1.5 -1.5 3 3">{circles}</svg>;
}

function factorOutCyclotomics(
  p: number[],
  nodes: number
): [Record<number, number>, number[], number] {
  let dividedPoly = p;

  const cyclotomics: Record<number, number> = {};
  for (let i = 1; i <= nodes; i++) {
    while (true) {
      let [q, rem] = divide(dividedPoly, cyclotomicPolynomial(i));
      if (rem.length > 0 || rightStrip(dividedPoly).length == 0) break;
      console.log(q, rem, i);
      dividedPoly = q;
      if (!cyclotomics[i]) cyclotomics[i] = 0;
      cyclotomics[i]++;
    }
  }

  let offset = 0;
  for (; offset < dividedPoly.length; offset++) {
    if (dividedPoly[offset] != 0) {
      const p = Array(offset + 1).fill(0);
      p[offset] = 1;
      dividedPoly = divide(dividedPoly, p)[0];
      break;
    }
  }
  return [cyclotomics, dividedPoly, offset];
}

function factorChandelier({ nodes, active }: Chandelier) {
  const cong: Record<number, number[]> = {};
  for (const i of factors(nodes)) {
    if (i == nodes) continue;
    cong[i] = Array(i).fill(0);
    for (const j of active) {
      cong[i][j % i]++;
    }
  }
  return cong;
}

function bruteForceEquivalenceClasses(n: number, k: number) {
  const all: number[][] = [];
  let count = 0;
  combinations(n, k, (i: number[]) => {
    if (count % 10000000 == 0) console.log(i);
    count++;
    if (balanced({ nodes: n, active: i })) {
      all.push(i.slice());
    }
  });

  const classes: Record<string, Set<string>> = {};
  for (const i of all) {
    const activePoly: number[] = Array(n + 1).fill(0);
    for (const j of i) activePoly[j] = 1;
    const [cyclotomics, divided, offset] = factorOutCyclotomics(activePoly, n);
    let cyclotomicString = "";
    for (const [n, p] of Object.entries(cyclotomics)) {
      cyclotomicString += `(${n},${p})`;
    }
    if (!classes[cyclotomicString]) classes[cyclotomicString] = new Set();
    classes[cyclotomicString].add(polyToString(divided));
  }

  return classes;
}

export default function Home() {
  const [nodes, setNodes] = useState<number>(30);
  const [active, setActive] = useState<number[]>([]);
  const cong = factorChandelier({ nodes, active });
  const activePoly: number[] = Array(nodes + 1).fill(0);
  for (const i of active) activePoly[i] = 1;

  const [cyclotomics, dividedPoly, offset] = factorOutCyclotomics(
    activePoly,
    nodes
  );
  let factoredPoly = "";
  if (offset > 0) factoredPoly = "x^" + offset;
  for (const [n, p] of Object.entries(cyclotomics)) {
    factoredPoly += `(Φ(${n}))^${p}`;
  }
  factoredPoly += `(${polyToString(dividedPoly)})`;

  const toggled = (toggle: number[]) => {
    const next = [];
    for (const i of active.concat(toggle))
      if (!toggle.includes(i) || !active.includes(i)) next.push(i);
    return next;
  };

  const symmetries = [];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        maxWidth: "100vw",
        maxHeight: "100%",
      }}
    >
      <Box
        sx={{
          minWidth: "450px",
          padding: "20px",
        }}
      >
        <Chandelier
          chandelier={{
            nodes: nodes,
            active: active,
          }}
          onToggle={() => {}}
        />
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Button
            startDecorator={<ArrowLeft />}
            onClick={() => {
              setActive(active.map((n) => (n - 1 + nodes) % nodes).sort());
            }}
          >
            Left
          </Button>

          <Button
            startDecorator={<ArrowRight />}
            onClick={() => {
              setActive(active.map((n) => (n + 1) % nodes).sort());
            }}
          >
            Right
          </Button>
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          flexGrow: 1,
          overflow: "auto",
        }}
      >
        <FormControl>
          <FormLabel>Number of candle holders</FormLabel>
          <Input
            type="number"
            defaultValue={nodes}
            onChange={(val) => {
              if (parseInt(val.target.value) > 0)
                setNodes(parseInt(val.target.value));
              setActive([]);
            }}
          />
        </FormControl>

        <Box
          style={{
            overflowX: "auto",
            maxWidth: "100%",
          }}
        >
          <FormLabel>Symmetries</FormLabel>
          <table>
            <tbody>
              {Object.entries(cong).map(([key, val]) => {
                return (
                  <tr key={key}>
                    <td>
                      <Typography level="body1">
                        {nodes / parseInt(key)}:
                      </Typography>
                    </td>
                    {val.map((x, i) => {
                      let color = "grey";
                      const lis: number[] = [];
                      for (let j = i; j < nodes; j += parseInt(key)) {
                        lis.push(j);
                      }

                      const newFactors = factorChandelier({
                        nodes,
                        active: toggled(lis),
                      });

                      let createsOtherSymmetries: boolean = false;
                      // ensure there aren't any new factors that don't divide nodes/parseInt(key)
                      for (const fac in newFactors) {
                        for (let j = 0; j < newFactors[fac].length; j++) {
                          if (
                            cong[fac][j] < newFactors[fac][j] &&
                            newFactors[fac][j] == nodes / parseInt(fac) &&
                            (nodes / parseInt(key)) % (nodes / parseInt(fac)) !=
                              0
                          ) {
                            createsOtherSymmetries = true;
                          }
                        }
                      }

                      if (x == nodes / parseInt(key)) color = "green";
                      else if (createsOtherSymmetries && x == 0) color = "red";
                      else if (x == 0) color = "black";
                      else if (balanced({ nodes, active: toggled(lis) }))
                        color = "blue";
                      return (
                        <Box
                          key={i}
                          component={"td"}
                          sx={{
                            minWidth: "20px",
                            minHeight: "20px",
                            backgroundColor: color,
                            border: "2px solid white",
                          }}
                          onClick={() => {
                            if (balanced({ nodes, active: toggled(lis) }))
                              setActive(toggled(lis));
                          }}
                        ></Box>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
        <Box>
          <FormLabel>Polynomial</FormLabel>
          <p>
            Cyclotomic polynomial #{nodes}:{" "}
            {polyToString(cyclotomicPolynomial(nodes))}
          </p>
          <p>Active candles: {polyToString(activePoly)}</p>
          <p>
            Remainder:{" "}
            {polyToString(divide(activePoly, cyclotomicPolynomial(nodes))[0])}
          </p>
          <p>Factored: {factoredPoly}</p>
        </Box>
      </Box>
    </Box>
  );
}
