/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect, useState } from 'react';
import { Chart as ReactChart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  ChartData,
  ChartArea,
  LineController,
  ChartTypeRegistry,
  ChartConfiguration,
} from 'chart.js';
import { format, parseISO } from 'date-fns';

import { formatNumber } from "../shared/formatNumber";

import { ExternalTooltipHandler } from './ExternalTooltipHandler';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, {
  id: 'uniqueid5', //typescript crashes without id
  beforeDraw: (chart) => {
    const config = chart.config as ChartConfiguration;
    const type = config.type;
    if (type === ('shadowLine' as keyof ChartTypeRegistry)) {
      const { ctx } = chart;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#FBFDFF';
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    }
  },
  afterDraw: function (chart: any) {
    if (chart.tooltip?._active && chart.tooltip?._active.length && chart.config.type === 'shadowLine') {
      const activePoint = chart.tooltip?._active[0];
      const ctx = chart.ctx;
      const verticalStrokeGradient = ctx.createLinearGradient(0, 0, 0, chart.height);
      verticalStrokeGradient.addColorStop(1, '#C87DEE00');
      verticalStrokeGradient.addColorStop(0.5, '#B045E680');
      verticalStrokeGradient.addColorStop(0, '#AA00FF');
      const x = activePoint.element.x;
      let offset;
      if (chart.tooltip.dataPoints[0].element.y < 100) {
        offset = 70;
      } else {
        offset = 110;
      }
      const topY = chart.scales.y.top + chart.tooltip.y - offset;
      const bottomY = chart.scales.y.bottom + 22;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, topY);
      ctx.lineTo(x, bottomY);
      ctx.lineWidth = 1;
      ctx.strokeStyle = verticalStrokeGradient;
      ctx.stroke();
      ctx.globalCompositeOperation = 'destination-over';

      ctx.restore();
    }
  },
  afterUpdate: function (chart: any) {
    if (chart.config.type === 'shadowLine') {
      const datasets = chart.data.datasets;
      for (let d = 0; d < datasets.length; d++) {
        const meta = chart.getDatasetMeta(d);
        meta._clip.left = 30;
        // meta._clip.right = 30;
        meta._clip.top = 30;
        meta._clip.bottom = 30;
      }
    }
  },
});

class Custom extends LineController {
  draw() {
    super.draw();
    const ctx = this.chart.ctx;
    const _stroke = ctx.stroke;
    ctx.stroke = function () {
      ctx.save();
      ctx.shadowColor = '#BF6BEB60';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 30;
      // eslint-disable-next-line prefer-rest-params
      _stroke.apply(this, arguments as unknown as [path: Path2D]);
      ctx.restore();
    };
  }
}

Custom.id = 'shadowLine';
Custom.defaults = LineController.defaults;
ChartJS.register(Custom);

function createGradient(ctx: any, area: ChartArea) {
  const gradient = ctx.createLinearGradient(area.left, 0, area.right, 0);
  const pointerGradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
  pointerGradient.addColorStop(0, 'white');
  pointerGradient.addColorStop(1, '#F6F2FF');

  gradient.addColorStop(0, '#EFE1FB');
  gradient.addColorStop(0.3, '#BF49D7ff');
  gradient.addColorStop(0.5, '#BF49D7ff');
  gradient.addColorStop(0.7, '#ED4D9Bff');
  gradient.addColorStop(0.9, '#FCE9C0ff');
  gradient.addColorStop(1, '#FCE3BA');

  return { gradient, pointerGradient };
}

function Chart({ data, labels }: { data: number[]; labels: string[] }) {
  const chartRef = useRef<ChartJS>(null);
  const [chartData, setChartData] = useState<ChartData<'line'>>({
    datasets: [],
  });

  useEffect(() => {
      console.log(data);
  console.log(labels);
    const chart = chartRef.current;
    if (!chart) {
      return;
    }
    const chartData = {
      labels: labels.map((l) => format(parseISO(l), 'MM/dd')),
      datasets: [
        {
          data: data as number[],
          borderColor: () => createGradient(chart.ctx, chart.chartArea).gradient,
          tension: 0.4,
        },
      ],
    };

    setChartData(chartData);
    chart.update();
  }, [data, labels]);

  const maxDataValue = (data as number[])?.reduce((a, b) => Math.max(a, b));
  const minDataValue = (data as number[])?.reduce((a, b) => Math.min(a, b));
  // function roundNum(num: number) {
  //   return Math.round(num / 1) * 1;
  // }
  const range = maxDataValue - minDataValue;

  const yMax = maxDataValue + 0.1 * range;
  const yMin = minDataValue - 0.1 * range;

  return (
    <div className="single-line-chart-container">
      <ReactChart
        ref={chartRef}
        className="w-full h-full max-h-[370px]"
        options={{
          interaction: {
            mode: 'index',
            intersect: false,
          },
          layout: {
            padding: {
              top: 35,
            },
          },
          scales: {
            y: {
              max: yMax,
              min: yMin,
              afterBuildTicks: (axis) =>
                (axis.ticks = [minDataValue, maxDataValue].map((v) => ({
                  value: v,
                }))),

              grid: { display: false, drawBorder: false } as any,
              ticks: {
                padding: 15,
                callback: (value) => formatNumber(Number(value)),
              },
            },
            x: {
              offset: true,
              grid: { display: false, drawBorder: false } as any,
              ticks: {
                // padding: 30,
                // maxTicksLimit: 10,
                maxRotation: -90,
                minRotation: 0,
              },
            },
          },
          maintainAspectRatio: false,
          elements: {
            point: {
              radius: 0,
              hoverRadius: 0,
              borderWidth: 0,
              hoverBorderWidth: 0,
            },
          },
          plugins: {
            tooltip: {
              enabled: false,
              position: 'nearest',
              external: ExternalTooltipHandler,
            },
          },
          responsive: true,
        }}
        type={'shadowLine' as keyof ChartTypeRegistry}
        data={chartData}
      />
    </div>
  );
}

export default function Renderer({ options, data }: any) {
  // if (loading || error || !labels?.length || !data?.length) {
  //   return (
  //     <Container>
  //       <ChartSkeleton />
  //       <div className="flex w-full justify-between">
  //         {[...Array(9)].map((_, i) => (
  //           <Skeleton key={i} containerClassName="flex items-center" width={40} height={4} />
  //         ))}
  //       </div>
  //     </Container>
  //   );
  // }

  const values = data.rows.map((i: any) => i.value);
  const labels = data.rows.map((i: any) => i.label?.toISOString());

  console.log(labels);

  return <Chart data={values} labels={labels} />;
}
