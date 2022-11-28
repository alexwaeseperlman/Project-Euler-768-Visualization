import _, { remove, xor } from "lodash";
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
  LinearProgress,
  Select,
  Option,
} from "@mui/joy";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Backup } from "@mui/icons-material";

import {
  divide,
  cyclotomicPolynomial,
  rightStrip,
  polyToString,
  eps,
  factorOutCyclotomics,
  multiply,
} from "@src/polynomials";

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

function getCOM({ nodes, active }: Chandelier) {
  let count = 0;
  let com = [0, 0];
  for (let i of active) {
    const [x, y] = [
      Math.sin(((2 * i) / nodes) * Math.PI),
      Math.cos(((2 * i) / nodes) * Math.PI),
    ];
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

const solutions: Record<
  string,
  {
    progress: number;
    result: Record<string, Record<string, number>> | null;
    worker: Worker;
  }
> = {};
function useEquivalenceClasses(
  n: number,
  k: number
): [number, Record<string, Record<string, number>> | null] {
  const key = `${n},${k}`;
  const [progress, setProgress] = useState<number>(
    solutions[key]?.progress || 0
  );
  const [result, setResult] = useState<Record<
    string,
    Record<string, number>
  > | null>(solutions[key]?.result || null);
  useEffect(() => {
    if (!solutions[key]) {
      solutions[key] = {
        progress: 0,
        result: null,
        worker: new Worker(new URL("@src/worker.ts", import.meta.url)),
      };
      solutions[key].worker.postMessage([n, k]);
      solutions[key].worker.addEventListener("message", (ev) => {
        solutions[key].progress = ev.data.progress;
        solutions[key].result = ev.data.result;
      });
    }
    const listener = (ev: MessageEvent<any>) => {
      setProgress(ev.data.progress);
      setResult(ev.data.result);
    };

    setProgress(solutions[key].progress);
    setResult(solutions[key].result);

    solutions[key].worker.addEventListener("message", listener);
    return () => solutions[key].worker.removeEventListener("message", listener);
  }, [n, k, key]);
  return [progress, result];
}

export default function Home() {
  const [nodes, setNodes] = useState<number>(30);
  const [active, setActive] = useState<number[]>([]);
  const [targetActive, setTargetActive] = useState<number>(1);
  const cong = factorChandelier({ nodes, active });
  const activePoly: number[] = Array(nodes + 1).fill(0);
  for (const i of active) activePoly[i] = 1;

  const [progress, classes] = useEquivalenceClasses(nodes, targetActive);

  const [selectedClass, setSelectedClass] = useState<string>("");

  function updatePoly(newValue: string, selectedClass: string) {
    console.log(newValue, selectedClass);
    if (!selectedClass || !newValue) return;
    const poly = newValue?.split(",").map((n) => parseInt(n));
    const prod = (selectedClass as string)
      .split(":")
      .map((s) => {
        return s.split(",").map((n) => parseInt(n));
      })
      .flatMap(([n, p]) => {
        return Array(p).fill(cyclotomicPolynomial(n));
      })
      .concat([poly])
      .reduce(
        (a, b) => {
          console.log(a, b, multiply(a, b));
          return multiply(a, b);
        },
        [1]
      );
    console.log(prod);
    const out = [];
    for (let i = 0; i < prod.length; i++) if (prod[i]) out.push(i);
    console.log(out);
    setActive(out);
  }
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

  useEffect(() => {
    setTargetActive(active.length);
    if (classes) {
      setSelectedClass(
        Object.entries(cyclotomics)
          .map(([k, v]) => `${k},${v}`)
          .join(":")
      );
    }
  }, [active.length, classes, cyclotomics]);

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
          width: "550px",
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

        <FormControl>
          <FormLabel>Number of active candles</FormLabel>
          <Input
            type="number"
            value={targetActive}
            sx={{
              flexGrow: 1,
            }}
            onChange={(val) => {
              if (
                parseInt(val.target.value) > 0 &&
                parseInt(val.target.value) <= nodes
              )
                setTargetActive(parseInt(val.target.value));
            }}
          />
        </FormControl>
        {classes ? (
          <Box>
            Found{" "}
            {Object.values(classes)
              .map((r) => Object.values(r).reduce((x, y) => x + y, 0))
              .reduce((x, y) => x + y, 0)}{" "}
            balanced arrangements
            <Select
              value={selectedClass}
              placeholder="Select a class of arrangement"
              onChange={(v, newValue) => {
                if (newValue) setSelectedClass(newValue);

                if (newValue && classes && classes[newValue]) {
                  updatePoly(Object.keys(classes[newValue])[0], newValue);
                }
              }}
              componentsProps={{
                listbox: {
                  sx: {
                    maxHeight: "500px",
                    overflow: "auto",
                  },
                },
              }}
            >
              {Object.keys(classes).map((key) => (
                <Option value={key} key={key}>
                  {key}
                </Option>
              ))}
            </Select>
            <Select
              value={dividedPoly.join(",")}
              placeholder="Select an arrangement"
              onChange={(e, newValue) => {
                if (newValue && selectedClass)
                  updatePoly(newValue, selectedClass);
              }}
              componentsProps={{
                listbox: {
                  sx: {
                    maxHeight: "500px",
                    overflow: "auto",
                  },
                },
              }}
            >
              {Object.keys(classes[selectedClass ?? ""] ?? {}).map((key) => (
                <Option value={key} key={key}>
                  {polyToString(key.split(",").map((n) => parseInt(n)))} (
                  {classes[selectedClass ?? ""][key]} symmetries)
                </Option>
              ))}
            </Select>
            <Button
              onClick={() => {
                if (classes && selectedClass)
                  updatePoly(
                    Object.keys(classes[selectedClass]).sort()[
                      (Object.keys(classes[selectedClass]).indexOf(
                        dividedPoly.join(",")
                      ) +
                        1) %
                        Object.keys(classes[selectedClass]).length
                    ],
                    selectedClass
                  );
              }}
            >
              Cycle selected arrangement
            </Button>
          </Box>
        ) : (
          <LinearProgress determinate value={progress * 100} />
        )}
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
