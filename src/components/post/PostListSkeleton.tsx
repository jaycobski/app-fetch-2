import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PostListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((index) => (
        <Card key={index}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-16 w-full" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PostListSkeleton;