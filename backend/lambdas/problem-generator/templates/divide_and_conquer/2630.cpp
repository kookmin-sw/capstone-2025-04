// BOJ - 2630 색종이 만들기

#include <iostream>
#define MAXN 128 + 1

using namespace std;

int map[MAXN][MAXN] = {0, }; int n;

struct color {
    int w = 0, b = 0;
    color operator+(color a) const {
        color t;
        t.w = w + a.w;
        t.b = b + a.b;
        return t;
    };
};

color div(int len, int x, int y)
{
    color ret;
    int clr[2] = {0, 0}; // white, black
    for(int i = x; i < x + len; i++)
        for(int j = y; j < y + len; j++)
            clr[map[i][j]]++;

    if(clr[0] == len * len) ret.w += 1;
    else if(clr[0] == 0) ret.b += 1;
    else
    {
        if(len == 1) return ret;
        len /= 2;
        ret = ret + div(len, x, y);
        ret = ret + div(len, x + len, y);
        ret = ret + div(len, x, y + len);
        ret = ret + div(len, x + len, y + len);
    }
    
    return ret;
}
int main()
{
    cin.tie(0); ios::sync_with_stdio(false);

    cin >> n;
    for(int i = 1; i <= n; i++)
        for(int j = 1; j <= n; j++)
            cin >> map[i][j];

    color res = div(n, 1, 1);

    cout << res.w << '\n' << res.b;
}