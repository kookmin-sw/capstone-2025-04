// BOJ - 9663 N-Queen

#include <iostream>
#define MAXN 15 + 1

using namespace std;

int n; int board[MAXN] = {0, };
int cnt = 0;

int abs(int n)
{
    return n < 0 ? -n : n;
}

void dfs(int row)
{
    if(row == n) cnt++;
    for(int i = 0; i < n; i++)
    {
        int ok = 1;

        for(int j = 0; j < row; j++)
            if(board[j] == i || abs(i - board[j]) == abs(row - j))
            {
                ok = 0;
                break;
            }

        if(ok)
        {
            board[row] = i;
            dfs(row + 1);
        }
    }
}

int main()
{
    cin >> n;
    
    dfs(0);

    cout << cnt;

}