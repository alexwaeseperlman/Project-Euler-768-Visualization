import _ from "lodash";
import {
  styled,
  Box,
  Typography,
  FormControl,
  FormLabel,
  Input,
  FormHelperText,
  Sheet,
} from "@mui/joy";
import { useState } from "react";

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

function getCOM({ nodes, active }: Chandelier) {
  let count = 0;
  let com = [0, 0];
  for (let i = 0; i < nodes; i++) {
    const [x, y] = [
      Math.cos(((2 * i) / nodes) * Math.PI),
      Math.sin(((2 * i) / nodes) * Math.PI),
    ];
    if (active.includes(i)) {
      com[0] += x;
      com[1] += y;
      count++;
    }
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

export default function Home() {
  const [nodes, setNodes] = useState<number>(30);
  const [active, setActive] = useState<number[]>([]);
  const cong = factorChandelier({ nodes, active });

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
        }}
      >
        <Chandelier
          chandelier={{
            nodes: nodes,
            active: active,
          }}
          onToggle={() => {}}
        />
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
            value={nodes}
            onChange={(val) => {
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
      </Box>
    </Box>
  );
}
