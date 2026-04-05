import Button from "./Button";

export default async function Projects() {
    const res = await fetch("https://jsonplaceholder.typicode.com/posts");
    const data = await res.json();

    return (
        <>
            <div>This is the projects page.</div>
            {data?.map((item: any) => {
                return (
                    <div key={item.id}>
                        <div className="flex gap-2">
                            <div>
                                <span>{item.id}-</span>
                            </div>
                            <div>
                                <h1>{item?.title}</h1>
                                <h3> {item?.body}</h3>
                            </div>
                        </div>
                        <Button />
                        <div className="w-full border" ></div>
                    </div>
                )
            })}
        </>
    );
}
