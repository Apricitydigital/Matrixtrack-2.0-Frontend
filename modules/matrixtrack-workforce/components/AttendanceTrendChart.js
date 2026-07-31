import React, { useEffect, useMemo, useState } from "react";
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
} from "recharts";

import { buildApiUrl } from "../config";

const ATTENDANCE_TREND_ENDPOINT = buildApiUrl(
    "/app/supervisor/wards/attendance-trend"
);

const AttendanceTrendChart = ({
    dashboardPayload = {},
    title = "Attendance Trend",
}) => {
    const [trendData, setTrendData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedMetric, setSelectedMetric] = useState("present");
    const getLast7DaysStart = () => {
        const date = new Date();
        date.setDate(date.getDate() - 6);

        return date.toISOString().split("T")[0];
    };

    const getToday = () => {
        return new Date().toISOString().split("T")[0];
    };

    const [chartStartDate, setChartStartDate] = useState(
        getLast7DaysStart()
    );

    const [chartEndDate, setChartEndDate] = useState(
        getToday()
    );
    const loadTrendData = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem("token");
            console.log("TREND REQUEST =", {
                user_id: dashboardPayload?.user_id,
                city_id: dashboardPayload?.city_id,
                startDate: chartStartDate,
                endDate: chartEndDate,
            });
            const response = await fetch(
                ATTENDANCE_TREND_ENDPOINT,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token
                            ? {
                                Authorization: `Bearer ${token}`,
                            }
                            : {}),
                    },
                    body: JSON.stringify({
                        user_id: dashboardPayload?.user_id ?? null,
                        city_id: dashboardPayload?.city_id ?? null,
                        startDate: chartStartDate,
                        endDate: chartEndDate,
                    }),
                }
            );

            console.log("Trend Status =", response.status);

            // const json = await response.json();

            console.log("Trend Status =", response.status);

            const json = await response.json();

            console.log("Trend Response =", json);


            if (json?.success) {
                const formattedData = (json?.data || []).map((item) => ({
                    ...item,
                    displayDate: item.date
                        ? new Date(item.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                        })
                        : "",
                }));

                console.log("Formatted Data =", formattedData);

                setTrendData(formattedData);
            } else {
                setTrendData([]);
            }
        } catch (error) {
            console.error(
                "Attendance Trend Error:",
                error
            );
            setTrendData([]);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        const today = new Date();

        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 6);

        setChartStartDate(
            lastWeek.toISOString().split("T")[0]
        );

        setChartEndDate(
            today.toISOString().split("T")[0]
        );
    }, []);
    useEffect(() => {
        if (
            chartStartDate &&
            chartEndDate
        ) {
            loadTrendData();
        }
    }, [
        dashboardPayload?.user_id,
        dashboardPayload?.city_id,
        chartStartDate,
        chartEndDate,
    ]);

    const metricLabel = useMemo(() => {
        switch (selectedMetric) {
            case "present":
                return "Present";
            case "leave":
                return "On Leave";
            case "absent":
                return "Absent";
            default:
                return "Present";
        }
    }, [selectedMetric]);
    console.log("Dashboard Payload =", dashboardPayload);
    console.log("Trend Data State =", trendData);

    return (
        <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-6 shadow-xl">

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">

                <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        📈 {title}
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Daily attendance trend over the selected period
                    </p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>

                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Live Data
                    </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                            From
                        </span>

                        <input
                            type="date"
                            value={chartStartDate}
                            onChange={(e) =>
                                setChartStartDate(e.target.value)
                            }
                            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-2 py-2 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                            To
                        </span>

                        <input
                            type="date"
                            value={chartEndDate}
                            onChange={(e) =>
                                setChartEndDate(e.target.value)
                            }
                            className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-2 py-2 text-sm"
                        />
                    </div>

                    <button
                        onClick={loadTrendData}
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
                    >
                        Apply
                    </button>

                    <select
                        value={selectedMetric}
                        onChange={(e) =>
                            setSelectedMetric(e.target.value)
                        }
                        className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="present">
                            Present
                        </option>

                        <option value="absent">
                            Absent
                        </option>

                        <option value="leave">
                            On Leave
                        </option>
                    </select>

                </div>
            </div>

            {loading ? (
                <div className="h-[320px] flex items-center justify-center text-gray-500 dark:text-gray-300">
                    Loading...
                </div>
            ) : trendData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center text-gray-500 dark:text-gray-300">
                    No attendance trend data available
                </div>
            ) : (
                <>


                    <ResponsiveContainer
                        width="100%"
                        height={320}
                    >
                        <ComposedChart data={trendData}>
                            <defs>
                                <linearGradient
                                    id="attendanceGradient"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                                    <stop offset="60%" stopColor="#2563EB" stopOpacity={0.15} />
                                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Legend
                                verticalAlign="top"
                                height={40}
                            />

                            <CartesianGrid
                                strokeDasharray="5 5"
                                stroke="#E5E7EB"
                                vertical={false}
                            />

                            <XAxis
                                dataKey="displayDate"
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                tick={{
                                    fill: "#6B7280",
                                    fontSize: 12,
                                }}
                            />

                            <YAxis
                                tick={{
                                    fill: "#6B7280",
                                }}
                            />

                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#fff",
                                    borderRadius: "16px",
                                    border: "1px solid #E5E7EB",
                                    boxShadow:
                                        "0 12px 30px rgba(0,0,0,0.15)",
                                }}
                            />

                            <Area
                                type="monotone"
                                dataKey={selectedMetric}
                                fill="url(#attendanceGradient)"
                                stroke="none"
                                fillOpacity={1}
                                isAnimationActive={true}
                            />

                            <Line
                                type="monotone"
                                dataKey={selectedMetric}
                                name={metricLabel}
                                stroke="#2563EB"
                                strokeWidth={3}
                                isAnimationActive={true}
                                connectNulls={true}
                                dot={{
                                    r: 5,
                                    fill: "#ffffff",
                                    stroke: "#2563EB",
                                    strokeWidth: 3,
                                }}
                                activeDot={{
                                    r: 8,
                                    fill: "#ffffff",
                                    stroke: "#2563EB",
                                    strokeWidth: 4,
                                }}
                                style={{
                                    filter: "drop-shadow(0 2px 6px rgba(37,99,235,.25))",
                                }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </>
            )}
        </div>
    );
};

export default AttendanceTrendChart;