import React, { useEffect, useState, useMemo, useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { ENDPOINTS } from "@/api/endpoints";
import { apiCall } from "@/api/apiCall";
import { toast } from "sonner";
import Loader from "./Loader";
import "./Ckeditor.css";

// ✅ Custom upload adapter
function MyUploadAdapter(loader: any) {
    this.loader = loader;
}

MyUploadAdapter.prototype.abort = function () { };

MyUploadAdapter.prototype.upload = function () {
    return this.loader.file
        .then((file: any) => new Promise((resolve, reject) => {
            const data = new FormData();
            data.append("image", file);
            data.append("upload", file);
            data.append("file", file);
            apiCall('post', ENDPOINTS.UPLOADING_MEDIA, data)
                .then(response => {
                    let uploadedUrl = response?.data?.data?.url || response?.data?.url || response?.data?.data?.image || response?.data?.image;
                    if (response?.success && uploadedUrl) {
                        if (typeof uploadedUrl === 'string' && uploadedUrl.startsWith('/')) {
                            uploadedUrl = `https://api.incensemedia.in${uploadedUrl}`;
                        }
                        resolve({
                            default: uploadedUrl,
                        });
                    } else {
                        const err = response?.error || 'Failed to upload image';
                        toast.error(typeof err === 'string' ? err : 'Image upload failed');
                        reject(typeof err === 'string' ? err : 'Image upload failed');
                    }
                })
                .catch(error => {
                    const err = error?.message || 'Image upload error';
                    toast.error(err);
                    reject(err);
                });
        }));
};

function MyCustomUploadAdapterPlugin(editor: any) {
    try {
        const fileRepo = editor.plugins.get("FileRepository");
        if (fileRepo) {
            fileRepo.createUploadAdapter = (loader: any) => {
                return new MyUploadAdapter(loader);
            };
        }
    } catch (_) { }

    // ✅ Intercept CKEditor Notification plugin so it NEVER triggers native window.alert
    try {
        const notification = editor.plugins.get("Notification");
        if (notification) {
            notification.on("show:warning", (evt: any, data: any) => {
                evt.stop();
                if (data?.message) {
                    toast.error(String(data.message));
                }
            }, { priority: "high" });
        }
    } catch (_) { }
}

const Ckeditor = ({ text, setText }: { text?: string; setText: (val: string) => void }) => {
    const [loader, setLoading] = useState(false);
    const editorRef = useRef<any>(null);
    const lastDataRef = useRef<string>(text || "");

    useEffect(() => {
        if (editorRef.current && text !== undefined && text !== lastDataRef.current) {
            const currentEditorData = editorRef.current.getData();
            if (text !== currentEditorData) {
                lastDataRef.current = text;
                editorRef.current.setData(text || "");
            }
        }
    }, [text]);

    useEffect(() => {
        const interval = setInterval(() => {
            // find all images inside CKEditor content
            const images = document.querySelectorAll(".ck-content img");
            images.forEach(img => {
                const src = img.getAttribute("src") || "";
                if (!src.startsWith("blob:") && !src.startsWith("data:") && !img.getAttribute("crossorigin")) {
                    img.setAttribute("crossorigin", "anonymous");
                }
            });
        }, 500); // keep checking every 0.5s

        return () => clearInterval(interval);
    }, []);

    const editorConfig = useMemo(() => ({
        extraPlugins: [MyCustomUploadAdapterPlugin],
        toolbar: [
            "heading", "|", 'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor',
            "bold", "italic", "underline", "link", "bulletedList", "numberedList", "blockQuote", "|", "code",
            "insertTable", "imageUpload", "mediaEmbed", "|",
            "undo", "redo", "codeBlock"
        ],
        heading: {
            options: [
                { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
                { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
                { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
                { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
                { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' }
            ]
        },
        mediaEmbed: {
            previewsInData: true,
            providers: [
                {
                    name: 'youtube',
                    url: [
                        /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/,
                        /^(?:https?:\/\/)?youtu\.be\/([\w-]{11})/,
                        /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([\w-]{11})/
                    ],
                    html: (match: any) => {
                        const id = match[1];
                        return `
                            <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
                            <iframe
                                src="https://www.youtube-nocookie.com/embed/${id}"
                                style="position:absolute;top:0;left:0;width:100%;height:100%;"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen
                            ></iframe>
                            </div>`;
                    }
                },
                {
                    name: 'vimeo',
                    url: [
                        /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/,
                        /^(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/
                    ],
                    html: (match: any) => {
                        const id = match[1];
                        return `
                            <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
                            <iframe
                                src="https://player.vimeo.com/video/${id}"
                                style="position:absolute;top:0;left:0;width:100%;height:100%;"
                                frameborder="0"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowfullscreen
                            ></iframe>
                            </div>`;
                    }
                },
                {
                    name: 'uploaded-video',
                    url: [
                        /^(https?:\/\/.*\.(mp4|webm|ogg))$/
                    ],
                    html: (match: any) => {
                        const url = match[0];
                        return `
                            <video controls style="max-width:100%">
                            <source src="${url}" type="video/mp4">
                            Your browser does not support the video tag.
                            </video>`;
                    }
                }
            ]
        },
        htmlSupport: {
            allow: [
                { name: 'img', attributes: true, classes: true, styles: true },
                { name: 'video', attributes: true, classes: true, styles: true },
                { name: 'source', attributes: true },
                { name: 'iframe', attributes: true, classes: true, styles: true },
                { name: 'div', attributes: true, classes: true, styles: true }
            ]
        }
    }), []);

    return (
        <>
            {loader && <Loader />}
            <CKEditor
                editor={ClassicEditor}
                config={editorConfig}
                data={text || ""}
                onReady={(editor) => {
                    editorRef.current = editor;
                    lastDataRef.current = editor.getData();
                }}
                onChange={(_event, editor) => {
                    if (editor && typeof editor.getData === "function") {
                        try {
                            const data = editor.getData();
                            if (data !== lastDataRef.current) {
                                lastDataRef.current = data;
                                setText(data);
                            }
                        } catch (_) { }
                    }
                }}
            />
        </>
    );
};

export default Ckeditor;
