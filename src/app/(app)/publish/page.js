"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

const DraftingView = dynamic(() => import("@/components/publish/DraftingView"), {
  ssr: false,
});
const LoadingView = dynamic(() => import("@/components/publish/LoadingView"), {
  ssr: false,
});
const BlockEditorView = dynamic(
  () => import("@/components/publish/BlockEditorView"),
  { ssr: false }
);
const PolishedView = dynamic(() => import("@/components/publish/PolishedView"), {
  ssr: false,
});

const STATES = {
  DRAFTING: "DRAFTING",
  LOADING: "LOADING",
  BLOCK_EDITOR: "BLOCK_EDITOR",
  POLISHED: "POLISHED",
};

export default function PublishPage() {
  const [state, setState] = useState(STATES.DRAFTING);
  const [steps, setSteps] = useState([]);

  // Preserved data between states
  const [articleData, setArticleData] = useState({
    title: "",
    subtitle: "",
    body: "",
  });
  const [blocks, setBlocks] = useState([]);
  const [flagsByBlock, setFlagsByBlock] = useState({});
  const [topicSummary, setTopicSummary] = useState("");
  const [keyArguments, setKeyArguments] = useState([]);
  const [polishedMarkdown, setPolishedMarkdown] = useState("");

  const updateStep = (index, status) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s))
    );
  };

  const handleBeginReview = useCallback(async ({ title, subtitle, body }) => {
    setArticleData({ title, subtitle, body });
    setState(STATES.LOADING);

    const loadingSteps = [
      { label: "Decomposing article into blocks", status: "active" },
      { label: "Reviewing blocks for issues", status: "pending" },
    ];
    setSteps(loadingSteps);

    try {
      // Step 1: Decompose
      const decomposeRes = await fetch("/api/editorial/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleText: body }),
      });

      if (!decomposeRes.ok) {
        const err = await decomposeRes.json();
        throw new Error(err.error || "Decomposition failed");
      }

      const decomposition = await decomposeRes.json();

      setTopicSummary(decomposition.topic_summary || "");
      setKeyArguments(decomposition.key_arguments || []);

      const decomposedBlocks = decomposition.blocks || [];

      setSteps((prev) => [
        { ...prev[0], status: "done" },
        { ...prev[1], status: "active" },
      ]);

      // Step 2: Review each block in parallel
      const reviewResults = await Promise.allSettled(
        decomposedBlocks.map((block, i) =>
          fetch("/api/editorial/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              articleText: body,
              blockText: block.text_content,
              blockId: block.id,
              blockNumber: i + 1,
              totalBlocks: decomposedBlocks.length,
            }),
          }).then((r) => r.json())
        )
      );

      // Build flags map
      const flags = {};
      decomposedBlocks.forEach((block, i) => {
        const result = reviewResults[i];
        if (result.status === "fulfilled" && result.value.flags) {
          flags[block.id] = result.value.flags;
        } else {
          flags[block.id] = [];
        }
      });

      setSteps((prev) => [
        { ...prev[0], status: "done" },
        { ...prev[1], status: "done" },
      ]);

      setBlocks(decomposedBlocks);
      setFlagsByBlock(flags);

      // Brief pause to show completion
      await new Promise((r) => setTimeout(r, 500));

      setState(STATES.BLOCK_EDITOR);
    } catch (err) {
      console.error("Review pipeline error:", err);
      alert("Error during review: " + err.message);
      setState(STATES.DRAFTING);
    }
  }, []);

  const handleFinalReview = useCallback(
    async (editedBlocks) => {
      setBlocks(editedBlocks);
      setState(STATES.LOADING);

      setSteps([
        { label: "Polishing article", status: "active" },
      ]);

      try {
        const polishRes = await fetch("/api/editorial/polish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: editedBlocks,
            originalArticle: articleData.body,
          }),
        });

        if (!polishRes.ok) {
          const err = await polishRes.json();
          throw new Error(err.error || "Polish failed");
        }

        const { polishedArticle } = await polishRes.json();

        setSteps([{ label: "Polishing article", status: "done" }]);
        setPolishedMarkdown(polishedArticle);

        await new Promise((r) => setTimeout(r, 500));

        setState(STATES.POLISHED);
      } catch (err) {
        console.error("Polish error:", err);
        alert("Error during polish: " + err.message);
        setState(STATES.BLOCK_EDITOR);
      }
    },
    [articleData.body]
  );

  const handleBackToDraft = useCallback(() => {
    setState(STATES.DRAFTING);
  }, []);

  const handleBackToBlocks = useCallback(() => {
    setState(STATES.BLOCK_EDITOR);
  }, []);

  switch (state) {
    case STATES.DRAFTING:
      return <DraftingView onBeginReview={handleBeginReview} />;

    case STATES.LOADING:
      return <LoadingView steps={steps} />;

    case STATES.BLOCK_EDITOR:
      return (
        <BlockEditorView
          initialBlocks={blocks}
          initialFlags={flagsByBlock}
          topicSummary={topicSummary}
          keyArguments={keyArguments}
          onBackToDraft={handleBackToDraft}
          onFinalReview={handleFinalReview}
        />
      );

    case STATES.POLISHED:
      return (
        <PolishedView
          initialTitle={articleData.title}
          initialSubtitle={articleData.subtitle}
          polishedMarkdown={polishedMarkdown}
          onBackToBlocks={handleBackToBlocks}
        />
      );

    default:
      return null;
  }
}
