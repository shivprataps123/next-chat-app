"use client";

import { useState } from "react";

export default function Button() {
    const [count, setCount] = useState(0);

    return (
        <>
            <div>This is button component inside projects</div>
            <button onClick={() => setCount(count + 1)} >Click me</button>
            <div>Count: {count}</div>
        </>
    );
}
