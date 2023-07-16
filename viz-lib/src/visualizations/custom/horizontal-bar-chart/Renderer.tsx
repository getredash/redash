import React from "react";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Tooltip,
  ChartData,
  ChartArea,
} from "chart.js";
import { useEffect, useRef, useState } from "react";
import { Chart } from "react-chartjs-2";

import { ExternalTooltipHandler } from "./ExternalTooltipHandler";

const PER_PAGE = 10;

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, BarController);
export type HorizontalBarChartVariant = "red-gradient" | "purple-gradient";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createGradient(ctx: any, area: ChartArea, variant?: HorizontalBarChartVariant, hovered = false) {
  const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);

  if (!hovered) {
    if (variant === "purple-gradient") {
      gradient.addColorStop(0, "#F2E1FB");
      gradient.addColorStop(0.2, "#DFB5F5");
      gradient.addColorStop(0.4, "#CD88EF");
      gradient.addColorStop(0.6, "#C06AEB");
      gradient.addColorStop(0.8, "#8D37B8");
      gradient.addColorStop(1, "#7B1FA2");
    } else {
      gradient.addColorStop(0, "#FBD9E4");
      gradient.addColorStop(0.2, "#F7B3CA");
      gradient.addColorStop(0.4, "#F48CAF");
      gradient.addColorStop(0.6, "#EC407A");
      gradient.addColorStop(0.8, "#BD3362");
      gradient.addColorStop(1, "#97294E");
    }
  } else {
    if (variant === "purple-gradient") {
      gradient.addColorStop(0, "#C0B2C7");
      gradient.addColorStop(1, "#2E0C3D");
    } else {
      gradient.addColorStop(0, "#C7ACB5");
      gradient.addColorStop(1, "#4A1426");
    }
  }

  return gradient;
}

// const Container = tw.div`
//   flex items-center justify-center h-full
//   `;

export default function Renderer({ data, options }: any) {
  const page = 0;
  //   if (error || loading) {
  //     return (
  //       <Container>
  //         <div className="flex-y w-full gap-1.5">
  //           {[25, 90, 33, 33, 13, 18, 65, 60, 25, 63].map((d, i) => (
  //             <div key={i} className="flex w-full justify-start gap-16">
  //               <div className="flex gap-3 items-center shrink-0">
  //                 {skeletonPictures ? (
  //                   <Skeleton circle containerClassName="h-[30px] w-[30px] flex items-center" width={30} height={30} />
  //                 ) : (
  //                   ""
  //                 )}
  //                 <Skeleton containerClassName="h-[30px] flex items-center" width={75} height={4} />
  //               </div>
  //               <Skeleton containerClassName="w-full flex items-center" width={`${d}%`} height={24} />
  //             </div>
  //           ))}
  //           <div className="flex mt-4">
  //             <div className={`${skeletonPictures ? "w-48" : "w-36"} shrink-0`}></div>
  //             <div className="flex w-full justify-between">
  //               {[...Array(5)].map((_, i) => (
  //                 <Skeleton key={i} containerClassName="flex items-center" width={40} height={4} />
  //               ))}
  //             </div>
  //           </div>
  //         </div>
  //       </Container>
  //     );
  //   }

  const dataPage = data.rows.slice(PER_PAGE * page, PER_PAGE * (page + 1));

  return (
    <SafeHorizontalBarChart
      data={dataPage}
      variant={"red-gradient"}
      maxX={Math.max(...data.rows.map((d: any) => d.size))}
    />
  );
}

function SafeHorizontalBarChart({ data, maxX, variant = "red-gradient" }: any) {
  const chartRef = useRef<ChartJS>(null);
  const [chartData, setChartData] = useState<ChartData<"bar">>({
    datasets: [],
  });
  const [activeElement, setActiveElement] = useState<number | null>(null);
  const [chartMouseOver, setChartMouseOver] = useState(false);

  const labels = data.map((d: any) => d.name);
  const values = data.map((d: any) => d.size);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !labels) {
      return;
    }

    const emptyLabelsCount = PER_PAGE - labels.length;
    const emptyLabels = emptyLabelsCount >= 0 ? [...Array(emptyLabelsCount)] : [];
    const safeLabels = labels.map((d: any) => d || "<empty>");
    const labelsWithEmpty = [...safeLabels, ...emptyLabels];

    const chartData = {
      labels: labelsWithEmpty,
      datasets: [
        {
          data: values,
          barThickness: 24,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          // backgroundColor: (element: any) => {
          //   if (chartMouseOver && element.dataIndex !== activeElement) {
          //     return createGradient(chart.ctx, chart.chartArea, variant, true);
          //   }
          //   return createGradient(chart.ctx, chart.chartArea, variant);
          // },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          backgroundColor: () => {
            // @ts-ignore
            return createGradient(chart.ctx, chart.chartArea, variant);
          },
          hoverBorderColor: () => {
            // @ts-ignore
            return createGradient(chart.ctx, chart.chartArea, variant, true);
          },
          hoverBorderWidth: 2,
        },
      ],
    };
    setChartData(chartData);
    chart.update();
  }, [data, activeElement, chartMouseOver]);

  return (
    <Chart
      type="bar"
      ref={chartRef}
      style={{ maxWidth: "100%" }}
      width={"100%"}
      height={"100%"}
      onMouseEnter={() => setChartMouseOver(true)}
      onMouseLeave={() => {
        setChartMouseOver(false);
        setActiveElement(-1);
      }}
      // plugins={[ChartDataLabels]}
      options={{
        indexAxis: "y" as const,
        maintainAspectRatio: false,
        responsive: true,

        elements: {
          bar: {
            borderWidth: 0,
            borderRadius: 8,
          },
        },
        scales: {
          // @ts-ignore
          y: { grid: { display: false, drawBorder: false }, ticks: { font: { size: 12 }, color: "#474E6A" } },
          x: {
            // @ts-ignore
            grid: { display: false, drawBorder: false },
            ticks: { font: { size: 12 }, color: "#A6B5D3" },
            max: maxX,
          },
        },

        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
            position: "nearest",
            external: ExternalTooltipHandler,
          },
          // datalabels: {
          //   anchor: 'end',
          //   align: 'left',
          //   color: function (context) {
          //     // if (context.dataIndex <= 4) {
          //     //   return 'rgba(106, 114, 144, 1)';
          //     // }
          //     return 'rgba(251, 253, 255, 1)';
          //   },
          //   display: function (context) {
          //     if (chartMouseOver && context.dataIndex === activeElement) {
          //       return true;
          //     }
          //     return false; // display labels with an odd index
          //   },
          // },
        },
        onHover: (_, elements) => (elements.length ? setActiveElement(elements[0].index) : setActiveElement(-1)),
      }}
      data={chartData}
    />
  );
}
