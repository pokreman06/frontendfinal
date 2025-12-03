from mcp.server.fastmcp import FastMCP
from manager import Manager
from typing import Any
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app for HTTP service
app = FastAPI(
    title="Facebook MCP Service",
    description="Facebook Page Management Service",
    version="1.0.0"
)

# MCP Server for tool protocol
mcp = FastMCP("FacebookMCP")
manager = Manager()

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "FacebookMCP"}

@mcp.tool()
def post_to_facebook(message: str) -> dict[str, Any]:
    """Create a new Facebook Page post with a text message.
    Input: message (str)
    Output: dict with post ID and creation status
    """
    return manager.post_to_facebook(message)

@mcp.tool()
def reply_to_comment(post_id: str, comment_id: str, message: str) -> dict[str, Any]:
    """Reply to a specific comment on a Facebook post.
    Input: post_id (str), comment_id (str), message (str)
    Output: dict with reply creation status
    """
    return manager.reply_to_comment(post_id, comment_id, message)

@mcp.tool()
def get_page_posts() -> dict[str, Any]:
    """Fetch the most recent posts on the Page.
    Input: None
    Output: dict with list of post objects and metadata
    """
    return manager.get_page_posts()

@mcp.tool()
def get_post_comments(post_id: str) -> dict[str, Any]:
    """Retrieve all comments for a given post.
    Input: post_id (str)
    Output: dict with comment objects
    """
    return manager.get_post_comments(post_id)

@mcp.tool()
def delete_post(post_id: str) -> dict[str, Any]:
    """Delete a specific post from the Facebook Page.
    Input: post_id (str)
    Output: dict with deletion result
    """
    return manager.delete_post(post_id)

@mcp.tool()
def delete_comment(comment_id: str) -> dict[str, Any]:
    """Delete a specific comment from the Page.
    Input: comment_id (str)
    Output: dict with deletion result
    """
    return manager.delete_comment(comment_id)


@mcp.tool()
def hide_comment(comment_id: str) -> dict[str, Any]:
    """Hide a comment from public view."""
    return manager.hide_comment(comment_id)


@mcp.tool()
def unhide_comment(comment_id: str) -> dict[str, Any]:
    """Unhide a previously hidden comment."""
    return manager.unhide_comment(comment_id)

@mcp.tool()
def delete_comment_from_post(post_id: str, comment_id: str) -> dict[str, Any]:
    """Alias to delete a comment on a post.
    Input: post_id (str), comment_id (str)
    Output: dict with deletion result
    """
    return manager.delete_comment_from_post(post_id, comment_id)

@mcp.tool()
def filter_negative_comments(comments: dict[str, Any]) -> list[dict[str, Any]]:
    """Filter comments for basic negative sentiment.
    Input: comments (dict)
    Output: list of flagged negative comments
    """
    return manager.filter_negative_comments(comments)

@mcp.tool()
def get_number_of_comments(post_id: str) -> int:
    """Count the number of comments on a given post.
    Input: post_id (str)
    Output: integer count of comments
    """
    return manager.get_number_of_comments(post_id)

@mcp.tool()
def get_number_of_likes(post_id: str) -> int:
    """Return the number of likes on a post.
    Input: post_id (str)
    Output: integer count of likes
    """
    return manager.get_number_of_likes(post_id)

@mcp.tool()
def get_post_insights(post_id: str) -> dict[str, Any]:
    """Fetch all insights metrics (impressions, reactions, clicks, etc).
    Input: post_id (str)
    Output: dict with multiple metrics and their values
    """
    return manager.get_post_insights(post_id)

@mcp.tool()
def get_post_impressions(post_id: str) -> dict[str, Any]:
    """Fetch total impressions of a post.
    Input: post_id (str)
    Output: dict with total impression count
    """
    return manager.get_post_impressions(post_id)

@mcp.tool()
def get_post_impressions_unique(post_id: str) -> dict[str, Any]:
    """Fetch unique impressions of a post.
    Input: post_id (str)
    Output: dict with unique impression count
    """
    return manager.get_post_impressions_unique(post_id)

@mcp.tool()
def get_post_impressions_paid(post_id: str) -> dict[str, Any]:
    """Fetch paid impressions of a post.
    Input: post_id (str)
    Output: dict with paid impression count
    """
    return manager.get_post_impressions_paid(post_id)

@mcp.tool()
def get_post_impressions_organic(post_id: str) -> dict[str, Any]:
    """Fetch organic impressions of a post.
    Input: post_id (str)
    Output: dict with organic impression count
    """
    return manager.get_post_impressions_organic(post_id)

@mcp.tool()
def get_post_engaged_users(post_id: str) -> dict[str, Any]:
    """Fetch number of engaged users.
    Input: post_id (str)
    Output: dict with engagement count
    """
    return manager.get_post_engaged_users(post_id)

@mcp.tool()
def get_post_clicks(post_id: str) -> dict[str, Any]:
    """Fetch number of post clicks.
    Input: post_id (str)
    Output: dict with click count
    """
    return manager.get_post_clicks(post_id)

@mcp.tool()
def get_post_reactions_like_total(post_id: str) -> dict[str, Any]:
    """Fetch number of 'Like' reactions.
    Input: post_id (str)
    Output: dict with like count
    """
    return manager.get_post_reactions_like_total(post_id)

@mcp.tool()
def get_post_reactions_love_total(post_id: str) -> dict[str, Any]:
    """Fetch number of 'Love' reactions.
    Input: post_id (str)
    Output: dict with love count
    """
    return manager.get_post_reactions_love_total(post_id)

@mcp.tool()
def get_post_reactions_wow_total(post_id: str) -> dict[str, Any]:
    """Fetch number of 'Wow' reactions.
    Input: post_id (str)
    Output: dict with wow count
    """
    return manager.get_post_reactions_wow_total(post_id)

@mcp.tool()
def get_post_reactions_haha_total(post_id: str) -> dict[str, Any]:
    """Fetch number of 'Haha' reactions.
    Input: post_id (str)
    Output: dict with haha count
    """
    return manager.get_post_reactions_haha_total(post_id)

@mcp.tool()
def get_post_reactions_sorry_total(post_id: str) -> dict[str, Any]:
    """Fetch number of 'Sorry' reactions.
    Input: post_id (str)
    Output: dict with sorry count
    """
    return manager.get_post_reactions_sorry_total(post_id)

@mcp.tool()
def get_post_reactions_anger_total(post_id: str) -> dict[str, Any]:
    """Fetch number of 'Anger' reactions.
    Input: post_id (str)
    Output: dict with anger count
    """
    return manager.get_post_reactions_anger_total(post_id)

@mcp.tool()
def get_post_top_commenters(post_id: str) -> list[dict[str, Any]]:
    """Get the top commenters on a post.
    Input: post_id (str)
    Output: list of user IDs with comment counts
    """
    return manager.get_post_top_commenters(post_id)

@mcp.tool()
def post_image_to_facebook(image_url: str, caption: str) -> dict[str, Any]:
    """Post an image with a caption to the Facebook page.
    Input: image_url (str), caption (str)
    Output: dict of post result
    """
    return manager.post_image_to_facebook(image_url, caption)

@mcp.tool()
def send_dm_to_user(user_id: str, message: str) -> dict[str, Any]:
    """Send a direct message to a user.
    Input: user_id (str), message (str)
    Output: dict of result from Messenger API
    """
    return manager.send_dm_to_user(user_id, message)

@mcp.tool()
def update_post(post_id: str, new_message: str) -> dict[str, Any]:
    """Updates an existing post's message.
    Input: post_id (str), new_message (str)
    Output: dict of update result
    """
    return manager.update_post(post_id, new_message)
@mcp.tool()
def schedule_post(message: str, publish_time: int) -> dict[str, Any]:
    """Schedule a new post for future publishing.
    Input: message (str), publish_time (Unix timestamp)
    Output: dict with scheduled post info
    """
    return manager.schedule_post(message, publish_time)

@mcp.tool()
def get_page_fan_count() -> int:
    """Get the Page's total fan/like count.
    Input: None
    Output: integer fan count
    """
    return manager.get_page_fan_count()

@mcp.tool()
def get_post_share_count(post_id: str) -> int:
    """Get the number of shares for a post.
    Input: post_id (str)
    Output: integer share count
    """
    return manager.get_post_share_count(post_id)


@mcp.tool()
def get_post_reactions_breakdown(post_id: str) -> dict[str, Any]:
    """Get counts for all reaction types on a post."""
    return manager.get_post_reactions_breakdown(post_id)


@mcp.tool()
def bulk_delete_comments(comment_ids: list[str]) -> list[dict[str, Any]]:
    """Delete multiple comments by ID."""
    return manager.bulk_delete_comments(comment_ids)


@mcp.tool()
def bulk_hide_comments(comment_ids: list[str]) -> list[dict[str, Any]]:
    """Hide multiple comments by ID."""
    return manager.bulk_hide_comments(comment_ids)


# HTTP endpoints mapping MCP tools
@app.post("/api/post")
async def post_message(message: str):
    """Create a new Facebook Page post"""
    try:
        result = manager.post_to_facebook(message)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error posting message: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/post-image")
async def post_image(image_url: str, caption: str):
    """Post an image with caption to Facebook"""
    try:
        result = manager.post_image_to_facebook(image_url, caption)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error posting image: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/reply")
async def reply_to_comment(post_id: str, comment_id: str, message: str):
    """Reply to a comment"""
    try:
        result = manager.reply_to_comment(post_id, comment_id, message)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error replying to comment: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/posts")
async def get_posts():
    """Fetch page posts"""
    try:
        result = manager.get_page_posts()
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error fetching posts: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/posts/{post_id}/comments")
async def get_comments(post_id: str):
    """Get comments for a post"""
    try:
        result = manager.get_post_comments(post_id)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error fetching comments: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.delete("/api/posts/{post_id}")
async def delete_post(post_id: str):
    """Delete a post"""
    try:
        result = manager.delete_post(post_id)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error deleting post: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/posts/{post_id}/insights")
async def get_insights(post_id: str):
    """Get post insights"""
    try:
        result = manager.get_post_insights(post_id)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error fetching insights: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/posts/{post_id}/reactions")
async def get_reactions(post_id: str):
    """Get post reactions breakdown"""
    try:
        result = manager.get_post_reactions_breakdown(post_id)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error fetching reactions: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.delete("/api/comments/{comment_id}")
async def delete_comment(comment_id: str):
    """Delete a comment"""
    try:
        result = manager.delete_comment(comment_id)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error deleting comment: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/comments/{comment_id}/hide")
async def hide_comment(comment_id: str):
    """Hide a comment"""
    try:
        result = manager.hide_comment(comment_id)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error hiding comment: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/messages")
async def send_dm(user_id: str, message: str):
    """Send direct message to user"""
    try:
        result = manager.send_dm_to_user(user_id, message)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/api/stats")
async def get_page_stats():
    """Get page statistics"""
    try:
        fan_count = manager.get_page_fan_count()
        return JSONResponse(content={"fan_count": fan_count})
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


if __name__ == "__main__":
    # Run as HTTP service with uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

