import { useEffect, useRef, useState } from "react";
import {
    TrendingUp,
    Trophy,
    MapPinned,
    AlertTriangle,
    Sparkles,
    Activity,
    ShieldCheck,
} from "lucide-react";

export default function LiveInsightsCard({
    summary,
    bestZone,
    bestWard,
    bestKothi,
    worstZone,
    worstWard,
    worstKothi,
    zeroAttendanceKothis,
    zeroAttendanceWards,
    lowPerformanceZones,
    attendanceChange,
    leaveInsight,
    midPunchInsight,
}) {
    const scrollRef = useRef(null);
    const [paused, setPaused] = useState(false);

    const attendanceDiff = Number(attendanceChange || 0);

    const insights = [
        {
            icon: <TrendingUp className="w-5 h-5 text-green-500" />,
            title: "Attendance Improvement",
            value:
                attendanceDiff >= 0
                    ? `Attendance increased by ${attendanceDiff.toFixed(
                        1
                    )}% compared to yesterday.`
                    : `Attendance decreased by ${Math.abs(
                        attendanceDiff
                    ).toFixed(1)}% compared to yesterday.`,
        },

        {
            icon: <Trophy className="w-5 h-5 text-yellow-500" />,
            title: "Best Performing Zone",
            value: bestZone
                ? `${bestZone.zone} (${bestZone.totalPercentage}%)`
                : "No data"
        },

        {
            icon: <MapPinned className="w-5 h-5 text-blue-500" />,
            title: "Best Performing Ward",
            value: bestWard
                ? `${bestWard.ward} (${bestWard.totalPercentage}%)`
                : "No data",
        },

        {
            icon: <MapPinned className="w-5 h-5 text-indigo-500" />,
            title: "Best Performing Kothi",
            value: bestKothi
                ? `${bestKothi.kothi} (${bestKothi.percentage}%)`
                : "No data",
        },

        {
            icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
            title: "Attention Required",
            value: `${lowPerformanceZones} Zones are below 50% attendance.`,
        },

        {
            icon: <Sparkles className="w-5 h-5 text-violet-500" />,
            title: "Today's Attendance",
            value: `${summary?.marked || 0} employees have marked attendance today.`,
        },

        {
            icon: <Activity className="w-5 h-5 text-cyan-500" />,
            title: "Pending Punch Out",
            value: `${summary?.inProgress || 0} employees have pending punch out.`,
        },
        {
            icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
            title: "Employees On Leave",
            value: leaveInsight
                ? `${leaveInsight.total} employees are on leave. Highest: ${leaveInsight.zone?.zone} (${leaveInsight.zone?.count})`
                : "No leave data",
        },
        {
            icon: <Activity className="w-5 h-5 text-cyan-500" />,
            title: "Mid Shift Punch",
            value: midPunchInsight
                ? `${midPunchInsight.total} employees completed mid punch. Highest: ${midPunchInsight.zone?.zone} (${midPunchInsight.zone?.count})`
                : "No mid punch data",
        },

        {
            icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
            title: "Total Workforce",
            value: `${summary?.totalEmployees || 0} employees registered.`,
        },
    ];

    // duplicate for seamless looping
    const data = insights;

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        let frame;

        const animate = () => {
            if (!paused) {
                container.scrollTop += 0.5;

                if (
                    container.scrollTop >=
                    container.scrollHeight / 2
                ) {
                    container.scrollTop = 0;
                }
            }

            frame = requestAnimationFrame(animate);
        };

        frame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(frame);
    }, [paused]);

    return (
        <div className="h-[500px] rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">

            {/* Header */}

            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">

                <div>

                    <h3 className="font-bold text-lg">
                        📢 Live Workforce Insights
                    </h3>

                    <p className="text-xs text-slate-500 mt-1">
                        Auto updating operational highlights
                    </p>

                </div>

                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30">

                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>

                    <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                        LIVE
                    </span>

                </div>

            </div>

            {/* Body */}

            <div
                ref={scrollRef}
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                className="h-[395px] overflow-y-auto p-4"
            >
                {data.map((item, index) => (

                    <div
                        key={index}
                        className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 hover:shadow-lg transition-all duration-300"
                    >

                        <div className="flex gap-4">

                            <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow">

                                {item.icon}

                            </div>

                            <div>

                                <h4 className="font-semibold text-slate-800 dark:text-white">

                                    {item.title}

                                </h4>

                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-6">

                                    {item.value}

                                </p>

                            </div>

                        </div>

                    </div>

                ))}
            </div>

        </div>
    );
}