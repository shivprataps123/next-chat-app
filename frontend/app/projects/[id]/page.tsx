export default async function ProjectPage({ params }) {
    const { id } = await params
    const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
    const data = await res.json();

    return (
        <div>
            <h1>Project ID: {id}</h1>
            <h2>{data.title}</h2>
            <p>{data.body}</p>
        </div>
    );
}